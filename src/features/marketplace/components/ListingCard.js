import { View, Text, TouchableOpacity, Image } from 'react-native';

export function ListingCard({
  styles,
  listing,
  isOwner,
  categoryIcon,
  categoryLabel,
  formattedDate,
  contactForPriceLabel,
  onDelete,
  onCall,
  onEmail,
}) {
  return (
    <View style={styles.listingCard}>
      <View style={styles.listingHeader}>
        <Text style={styles.listingIcon}>{categoryIcon}</Text>
        <View style={styles.listingMeta}>
          <Text style={styles.listingTitle}>{listing.title}</Text>
          <Text style={styles.listingCategory}>{categoryLabel}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={onDelete}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} />
      ) : null}

      {listing.description ? <Text style={styles.listingDesc}>{listing.description}</Text> : null}

      <View style={styles.listingFooter}>
        <View>
          {listing.price ? (
            <Text style={styles.listingPrice}>{listing.price}</Text>
          ) : (
            <Text style={styles.listingPriceMuted}>{contactForPriceLabel}</Text>
          )}
          <Text style={styles.listingSeller}>
            {listing.wineryName || listing.sellerName} · {listing.region}
          </Text>
          <Text style={styles.listingDate}>{formattedDate}</Text>
        </View>

        <View style={styles.contactBtns}>
          {listing.phone ? (
            <TouchableOpacity style={styles.contactBtn} onPress={onCall}>
              <Text style={styles.contactBtnText}>📞</Text>
            </TouchableOpacity>
          ) : null}
          {listing.email ? (
            <TouchableOpacity style={styles.contactBtn} onPress={onEmail}>
              <Text style={styles.contactBtnText}>✉️</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

