import { View, Text, TouchableOpacity } from 'react-native';

export function SupplierCard({ styles, supplier, language, onPress }) {
  return (
    <TouchableOpacity style={styles.supplierCard} onPress={onPress}>
      <View style={styles.supplierHeader}>
        <Text style={styles.supplierName}>{supplier.name}</Text>
        <Text style={styles.supplierLink}>→</Text>
      </View>
      <Text style={styles.supplierRegion}>📍 {supplier.region}</Text>
      <Text style={styles.supplierSpecialty}>{supplier.specialty[language] || supplier.specialty.en}</Text>
      <Text style={styles.supplierUrl}>{supplier.website}</Text>
    </TouchableOpacity>
  );
}

