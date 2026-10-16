const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(
  root,
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI',
);

const replacements = [
  ['weak let runtime:', 'weak var runtime:'],
  [
    'internal final class HostFunctionContext: Sendable {',
    'internal final class HostFunctionContext: @unchecked Sendable {',
  ],
  [
    'internal final class UnownedThisHostFunctionContext: Sendable {',
    'internal final class UnownedThisHostFunctionContext: @unchecked Sendable {',
  ],
  [
    'internal final class HostObjectContext: Sendable {',
    'internal final class HostObjectContext: @unchecked Sendable {',
  ],
  [
    'public final class JavaScriptPropNameID: JavaScriptType {',
    'public final class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable {',
  ],
  [
    'public struct JavaScriptArray: JavaScriptType, ~Copyable {',
    'public struct JavaScriptArray: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
  [
    'public struct JavaScriptBigInt: JavaScriptType, Sendable, ~Copyable {',
    'public struct JavaScriptBigInt: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
  [
    'public final class JavaScriptError: Error, Sendable {',
    'public final class JavaScriptError: Error, @unchecked Sendable {',
  ],
  [
    'public struct JavaScriptFunction: JavaScriptType, ~Copyable {',
    'public struct JavaScriptFunction: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
  [
    'public struct JavaScriptObject: JavaScriptType, Sendable, ~Copyable {',
    'public struct JavaScriptObject: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
  [
    'public struct JavaScriptPromise: JavaScriptType, ~Copyable {',
    'public struct JavaScriptPromise: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
  [
    'public final class JavaScriptValue: JavaScriptType, Equatable, Escapable {',
    'public final class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable {',
  ],
  [
    'public struct JavaScriptWeakObject: JavaScriptType, ~Copyable {',
    'public struct JavaScriptWeakObject: JavaScriptType, @unchecked Sendable, ~Copyable {',
  ],
];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    return entry.isFile() && entry.name.endsWith('.swift') ? [fullPath] : [];
  });
}

let changed = 0;

for (const file of walk(sourceRoot)) {
  const original = fs.readFileSync(file, 'utf8');
  let next = original;

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  if (next !== original) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}

if (changed > 0) {
  console.log(`Patched expo-modules-jsi Swift sources in ${changed} file(s).`);
}

/**
 * Serialize overlapping RCTHost runtime init. Concurrent registerNativeModules
 * races EXPermissionsService MapTable and aborts (SIGABRT) on iOS 26+/27.
 * See https://github.com/expo/expo/issues/45314
 */
function patchExpoReactNativeFactory() {
  const factoryPath = path.join(
    root,
    'node_modules',
    'expo',
    'ios',
    'AppDelegates',
    'ExpoReactNativeFactory.mm',
  );
  if (!fs.existsSync(factoryPath)) {
    return;
  }

  const original = fs.readFileSync(factoryPath, 'utf8');
  if (original.includes('expoRuntimeInitLock')) {
    return;
  }

  const methodRe =
    /(\/\/ \[JS thread\]\n- \(void\)host:\(nonnull RCTHost \*\)host didInitializeRuntime:\(facebook::jsi::Runtime &\)runtime\n\{\n)([\s\S]*?)(\n\}\n\n@end)/;
  const match = original.match(methodRe);
  if (!match) {
    console.warn('ExpoReactNativeFactory.mm layout changed; skip runtime-init lock patch.');
    return;
  }

  let body = match[2];
  // Older Expo templates assign the shared ivar first — prefer a method-local
  // AppContext so overlapping callbacks cannot swap contexts mid-flight.
  if (
    body.includes('_appContext = [[EXAppContext alloc] init];') &&
    !body.includes('EXAppContext *appContext =')
  ) {
    body = body
      .replace(
        '_appContext = [[EXAppContext alloc] init];',
        'EXAppContext *appContext = [[EXAppContext alloc] init];\n  _appContext = appContext;',
      )
      .replace(/\[_appContext /g, '[appContext ');
  }

  const indentedBody = body
    .split('\n')
    .map((line) => (line.length ? `  ${line}` : line))
    .join('\n');

  const replacement =
    `${match[1]}` +
    `  // Overlapping reload/host init must not register modules concurrently —\n` +
    `  // EXPermissionsService's MapTable is not thread-safe (expo/expo#45314).\n` +
    `  static NSObject *expoRuntimeInitLock = [NSObject new];\n` +
    `  @synchronized (expoRuntimeInitLock) {\n` +
    `${indentedBody}\n` +
    `  }` +
    `${match[3]}`;

  fs.writeFileSync(factoryPath, original.replace(methodRe, replacement));
  console.log('Patched ExpoReactNativeFactory.mm to serialize overlapping runtime init.');
}

/**
 * Thread-safe permission requester registration (expo/expo#45314).
 * Uses a process-wide singleton + static lock so overlapping RCTHost/AppContext
 * inits cannot race MapTable/NSDictionary — @synchronized(self) alone is not
 * enough when each AppContext owns a separate EXPermissionsService instance
 * and reload tears one down while another registers.
 * Only effective when expo-modules-core builds from source.
 */
function patchPermissionsService() {
  const serviceDir = path.join(
    root,
    'node_modules',
    'expo-modules-core',
    'ios',
    'Legacy',
    'Services',
    'Permissions',
  );
  const servicePath = path.join(serviceDir, 'EXPermissionsService.m');
  const headerPath = path.join(serviceDir, 'EXPermissionsService.h');
  const appContextPath = path.join(
    root,
    'node_modules',
    'expo-modules-core',
    'ios',
    'Core',
    'AppContext.swift',
  );

  if (!fs.existsSync(servicePath)) {
    return;
  }

  let src = fs.readFileSync(servicePath, 'utf8');
  if (!src.includes('expoPermissionsGlobalLock')) {
    // Upgrade any prior @synchronized(self) patch to a process-wide lock.
    src = src.replace(/@synchronized \(self\)/g, '@synchronized (expoPermissionsGlobalLock())');

    if (!src.includes('expoPermissionsGlobalLock')) {
      src = src.replace(
        `- (void)registerRequesters:(NSArray<id<EXPermissionsRequester>> *)newRequesters {
  for (id<EXPermissionsRequester> requester in newRequesters) {
    [_requesters setObject:requester forKey:[[requester class] permissionType]];
    [_requestersByClass setObject:requester forKey:[requester class]];
  }
}`,
        `- (void)registerRequesters:(NSArray<id<EXPermissionsRequester>> *)newRequesters {
  @synchronized (expoPermissionsGlobalLock()) {
    for (id<EXPermissionsRequester> requester in newRequesters) {
      [_requesters setObject:requester forKey:[[requester class] permissionType]];
      [_requestersByClass setObject:requester forKey:[requester class]];
    }
  }
}`,
      );

      src = src.replace(
        `- (id<EXPermissionsRequester>)getPermissionRequesterForType:(NSString *)type
{
  return _requesters[type];
}

- (id<EXPermissionsRequester>)getPermissionRequesterForClass:(Class)requesterClass
{
  return [_requestersByClass objectForKey:requesterClass];
}`,
        `- (id<EXPermissionsRequester>)getPermissionRequesterForType:(NSString *)type
{
  @synchronized (expoPermissionsGlobalLock()) {
    return _requesters[type];
  }
}

- (id<EXPermissionsRequester>)getPermissionRequesterForClass:(Class)requesterClass
{
  @synchronized (expoPermissionsGlobalLock()) {
    return [_requestersByClass objectForKey:requesterClass];
  }
}`,
      );
    }

    if (!src.includes('static NSObject *expoPermissionsGlobalLock')) {
      src = src.replace(
        '@implementation EXPermissionsService\n',
        `@implementation EXPermissionsService

static NSObject *expoPermissionsGlobalLock(void)
{
  static NSObject *lock;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    lock = [NSObject new];
  });
  return lock;
}

+ (instancetype)sharedInstance
{
  static EXPermissionsService *shared;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    shared = [[self alloc] init];
  });
  return shared;
}

`,
      );
    }

    fs.writeFileSync(servicePath, src);
    console.log('Patched EXPermissionsService.m with process-wide permissions lock + singleton.');
  }

  if (fs.existsSync(headerPath)) {
    let header = fs.readFileSync(headerPath, 'utf8');
    if (!header.includes('sharedInstance')) {
      header = header.replace(
        '@interface EXPermissionsService : NSObject <EXPermissionsInterface>\n',
        `@interface EXPermissionsService : NSObject <EXPermissionsInterface>

+ (instancetype)sharedInstance;

`,
      );
      fs.writeFileSync(headerPath, header);
      console.log('Patched EXPermissionsService.h with sharedInstance.');
    }
  }

  if (fs.existsSync(appContextPath)) {
    let appContext = fs.readFileSync(appContextPath, 'utf8');
    if (appContext.includes('EXPermissionsService()') && !appContext.includes('sharedInstance()')) {
      appContext = appContext.replace(
        'public lazy var permissions: EXPermissionsService? = EXPermissionsService()',
        'public lazy var permissions: EXPermissionsService? = EXPermissionsService.sharedInstance()',
      );
      fs.writeFileSync(appContextPath, appContext);
      console.log('Patched AppContext.swift to use shared EXPermissionsService.');
    }
  }

  // Prefer NSDictionary over NSMapTable(Class keys) — MapTable rehash races abort.
  src = fs.readFileSync(servicePath, 'utf8');
  if (src.includes('NSMapTable<Class, id<EXPermissionsRequester>>')) {
    src = src
      .replace(
        '@property (nonatomic, strong) NSMapTable<Class, id<EXPermissionsRequester>> *requestersByClass;',
        '@property (nonatomic, strong) NSMutableDictionary<NSString *, id<EXPermissionsRequester>> *requestersByClass;',
      )
      .replace(
        '_requestersByClass = [NSMapTable<Class, id<EXPermissionsRequester>> new];',
        '_requestersByClass = [NSMutableDictionary<NSString *, id<EXPermissionsRequester>> new];',
      )
      .replace(
        '[_requestersByClass setObject:requester forKey:[requester class]];',
        '[_requestersByClass setObject:requester forKey:NSStringFromClass([requester class])];',
      )
      .replace(
        'return [_requestersByClass objectForKey:requesterClass];',
        'return _requestersByClass[NSStringFromClass(requesterClass)];',
      );
    fs.writeFileSync(servicePath, src);
    console.log('Patched EXPermissionsService.m to use NSDictionary instead of NSMapTable.');
  }
}

/**
 * Defer Photos permission requester registration until gallery APIs are used.
 * OnCreate registration races overlapping RCTHost init (expo/expo#45314).
 */
function patchImagePickerLazyMediaLibrary() {
  const pickerPath = path.join(
    root,
    'node_modules',
    'expo-image-picker',
    'ios',
    'ImagePickerModule.swift',
  );
  if (!fs.existsSync(pickerPath)) {
    return;
  }

  let src = fs.readFileSync(pickerPath, 'utf8');
  if (src.includes('ensureMediaLibraryRequestersRegistered')) {
    return;
  }

  if (
    !src.includes(
      'MediaLibraryPermissionRequester(),\n        MediaLibraryWriteOnlyPermissionRequester()',
    )
  ) {
    return;
  }

  src = src.replace(
    `    OnCreate {
      self.appContext?.permissions?.register([
        CameraPermissionRequester(),
        MediaLibraryPermissionRequester(),
        MediaLibraryWriteOnlyPermissionRequester()
      ])
    }

    AsyncFunction("getCameraPermissionsAsync", { (promise: Promise) in
      self.handlePermissionRequest(requesterClass: CameraPermissionRequester.self, operationType: .get, promise: promise)
    })

    AsyncFunction("getMediaLibraryPermissionsAsync", { (writeOnly: Bool, promise: Promise) in
      self.handlePermissionRequest(requesterClass: self.getMediaLibraryPermissionRequester(writeOnly), operationType: .get, promise: promise)
    })

    AsyncFunction("requestCameraPermissionsAsync", { (promise: Promise) in
      self.handlePermissionRequest(requesterClass: CameraPermissionRequester.self, operationType: .ask, promise: promise)
    })

    AsyncFunction("requestMediaLibraryPermissionsAsync", { (writeOnly: Bool, promise: Promise) in
      self.handlePermissionRequest(requesterClass: self.getMediaLibraryPermissionRequester(writeOnly), operationType: .ask, promise: promise)
    })

    AsyncFunction("launchCameraAsync", { (options: ImagePickerOptions, promise: Promise) in
      guard let permissions = self.appContext?.permissions else {
        return promise.reject(PermissionsModuleNotFoundException())
      }

      guard permissions.hasGrantedPermission(usingRequesterClass: CameraPermissionRequester.self) else {
        return promise.reject(MissingCameraPermissionException())
      }

      self.launchImagePicker(sourceType: .camera, options: options, promise: promise)
    })
    .runOnQueue(DispatchQueue.main)

    AsyncFunction("launchImageLibraryAsync", { (options: ImagePickerOptions, promise: Promise) in
      self.launchImagePicker(sourceType: .photoLibrary, options: options, promise: promise)
    })
    .runOnQueue(DispatchQueue.main)
  }

  private var currentPickingContext: PickingContext?

  private func handlePermissionRequest(requesterClass: AnyClass, operationType: OperationType, promise: Promise) {`,
    `    OnCreate {
      // Only register camera here. Media-library requesters are registered
      // lazily on first gallery permission/API use — registering Photos
      // requesters during overlapping RCTHost init races EXPermissionsService
      // MapTable and aborts on iOS 26 (expo/expo#45314).
      self.appContext?.permissions?.register([
        CameraPermissionRequester()
      ])
    }

    AsyncFunction("getCameraPermissionsAsync", { (promise: Promise) in
      self.handlePermissionRequest(requesterClass: CameraPermissionRequester.self, operationType: .get, promise: promise)
    })

    AsyncFunction("getMediaLibraryPermissionsAsync", { (writeOnly: Bool, promise: Promise) in
      self.ensureMediaLibraryRequestersRegistered()
      self.handlePermissionRequest(requesterClass: self.getMediaLibraryPermissionRequester(writeOnly), operationType: .get, promise: promise)
    })

    AsyncFunction("requestCameraPermissionsAsync", { (promise: Promise) in
      self.handlePermissionRequest(requesterClass: CameraPermissionRequester.self, operationType: .ask, promise: promise)
    })

    AsyncFunction("requestMediaLibraryPermissionsAsync", { (writeOnly: Bool, promise: Promise) in
      self.ensureMediaLibraryRequestersRegistered()
      self.handlePermissionRequest(requesterClass: self.getMediaLibraryPermissionRequester(writeOnly), operationType: .ask, promise: promise)
    })

    AsyncFunction("launchCameraAsync", { (options: ImagePickerOptions, promise: Promise) in
      guard let permissions = self.appContext?.permissions else {
        return promise.reject(PermissionsModuleNotFoundException())
      }

      guard permissions.hasGrantedPermission(usingRequesterClass: CameraPermissionRequester.self) else {
        return promise.reject(MissingCameraPermissionException())
      }

      self.launchImagePicker(sourceType: .camera, options: options, promise: promise)
    })
    .runOnQueue(DispatchQueue.main)

    AsyncFunction("launchImageLibraryAsync", { (options: ImagePickerOptions, promise: Promise) in
      self.ensureMediaLibraryRequestersRegistered()
      self.launchImagePicker(sourceType: .photoLibrary, options: options, promise: promise)
    })
    .runOnQueue(DispatchQueue.main)
  }

  private var currentPickingContext: PickingContext?
  private var didRegisterMediaLibraryRequesters = false

  private func ensureMediaLibraryRequestersRegistered() {
    guard !didRegisterMediaLibraryRequesters else {
      return
    }
    didRegisterMediaLibraryRequesters = true
    appContext?.permissions?.register([
      MediaLibraryPermissionRequester(),
      MediaLibraryWriteOnlyPermissionRequester()
    ])
  }

  private func handlePermissionRequest(requesterClass: AnyClass, operationType: OperationType, promise: Promise) {`,
  );

  fs.writeFileSync(pickerPath, src);
  console.log('Patched ImagePickerModule.swift for lazy media-library permission registration.');
}

patchExpoReactNativeFactory();
patchPermissionsService();
patchImagePickerLazyMediaLibrary();
