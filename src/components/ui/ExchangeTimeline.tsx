import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export type ExchangeStatus =
  | 'requested'
  | 'approved'
  | 'pickup'
  | 'in_transit'
  | 'returned_to_store'
  | 'exchange_processed'
  | 'delivered';

const STATUS_ORDER: ExchangeStatus[] = [
  'requested',
  'approved',
  'pickup',
  'in_transit',
  'returned_to_store',
  'exchange_processed',
  'delivered',
];

interface ExchangeTimelineProps {
  currentStatus: ExchangeStatus;
}

export const ExchangeTimeline: React.FC<ExchangeTimelineProps> = ({ currentStatus }) => {
  const { t } = useTranslation();

  // Helper to determine the status level
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  const steps = [
    { key: 'requested', label: t('timeline_requested', 'Requested') },
    { key: 'approved', label: t('timeline_approved', 'Approved') },
    { key: 'pickup', label: t('timeline_pickup', 'Pickup') },
    { key: 'in_transit', label: t('timeline_in_transit', 'In Transit') },
    { key: 'returned_to_store', label: t('timeline_returned_to_store', 'Returned to Store') },
    { key: 'exchange_processed', label: t('timeline_exchange_processed', 'Exchange Processed') },
    { key: 'delivered', label: t('timeline_delivered', 'Delivered') },
  ];

  return (
    <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} className="flex-row">
            {/* Left Column: Dots and Lines */}
            <View className="items-center w-6 mr-3">
              {/* Dot */}
              {isCompleted && <View className="w-4 h-4 rounded-full bg-[#10B981] z-10" />}
              {isActive && (
                <View className="w-4 h-4 rounded-full bg-purple-700 border-2 border-purple-200 z-10" />
              )}
              {isFuture && (
                <View className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white z-10" />
              )}

              {/* Vertical Line connecting to next */}
              {!isLast && (
                <View
                  className={`w-[2px] flex-1 my-1 ${isCompleted || (isActive && index < currentIndex) ? 'bg-[#10B981]' : 'bg-gray-200'}`}
                  style={{ minHeight: 30 }}
                />
              )}
            </View>

            {/* Right Column: Content */}
            <View className={`flex-1 justify-start ${!isLast ? 'pb-6' : ''}`}>
              <Text
                className={`text-sm ${
                  isCompleted || isActive ? 'font-bold text-gray-900' : 'text-gray-400'
                }`}
                style={{ marginTop: -2 }}
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
