const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// iOS 27 terminates apps that don't adopt the UIScene lifecycle, and the
// Expo SDK 57 template still creates its window from the AppDelegate.

const WINDOW_SETUP_REGEX =
  /^[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif/m;

const SCENE_DELEGATE = `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = appDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let userActivity = connectionOptions.userActivities.first {
      let activityDictionary: [String: Any] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
      launchOptions[.userActivityDictionary] = activityDictionary
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = appDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let sourceApplication = context.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneDelegate: only Swift AppDelegate is supported');
    }

    let contents = config.modResults.contents;
    if (contents.includes('class SceneDelegate')) {
      return config;
    }

    if (!WINDOW_SETUP_REGEX.test(contents)) {
      throw new Error('withSceneDelegate: could not find window setup in AppDelegate.swift');
    }
    contents = contents.replace(WINDOW_SETUP_REGEX, '    self.launchOptions = launchOptions');

    const factoryProperty = 'var reactNativeFactory: RCTReactNativeFactory?';
    if (!contents.includes(factoryProperty)) {
      throw new Error('withSceneDelegate: could not find reactNativeFactory in AppDelegate.swift');
    }
    contents = contents.replace(
      factoryProperty,
      `${factoryProperty}\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?`
    );

    config.modResults.contents = contents + SCENE_DELEGATE;
    return config;
  });
}

module.exports = function withSceneDelegate(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};
