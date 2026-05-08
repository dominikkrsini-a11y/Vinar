import { View, Text, TouchableOpacity } from 'react-native';

export function MarketplaceTabs({ styles, tabs, activeTab, onChangeTab, renderLabel }) {
  return (
    <View style={styles.tabs}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.tabActive]}
          onPress={() => onChangeTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
            {renderLabel(tab)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

