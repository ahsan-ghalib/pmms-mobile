import { useState, useRef } from 'react';
import {
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
} from 'expo-audio';
import { Alert } from 'react-native';

const MIN_SEND_MS = 500;

export const useAudioRecording = (onRecordingFinished: (attachment: any) => void) => {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const recordingIntent = useRef(false);
  const startedAtRef = useRef(0);
  const onFinishedRef = useRef(onRecordingFinished);
  onFinishedRef.current = onRecordingFinished;

  const startRecording = async () => {
    try {
      recordingIntent.current = true;
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        recordingIntent.current = false;
        Alert.alert('Permission Denied', 'Permission to record audio is required.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      if (!recordingIntent.current) return;
      await audioRecorder.prepareToRecordAsync();
      if (!recordingIntent.current) return;
      audioRecorder.record();
      startedAtRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      recordingIntent.current = false;
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Unable to start audio recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    recordingIntent.current = false;
    if (!isRecording && !audioRecorder.isRecording) return;
    setIsRecording(false);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      const elapsed = Date.now() - startedAtRef.current;
      if (uri && elapsed >= MIN_SEND_MS) {
        onFinishedRef.current({ uri, name: 'audio_recording.m4a', mimeType: 'audio/m4a' });
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Error', 'Unable to stop audio recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    recordingIntent.current = false;
    if (!isRecording && !audioRecorder.isRecording) return;
    setIsRecording(false);
    try {
      await audioRecorder.stop();
    } catch (err) {
      console.error('Failed to cancel recording', err);
    }
  };

  return { isRecording, startRecording, stopRecording, cancelRecording, audioRecorder };
};
