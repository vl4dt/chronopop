import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from './ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../context/SyncContext';
import { PurchasesPackage } from 'react-native-purchases';

interface ProUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProUpgradeModal = ({ visible, onClose }: ProUpgradeModalProps) => {
  const { colors } = useTheme();
  const { purchasePackage, restorePurchases, offerings, isPro } = useSync();

  const handlePurchase = async (pkg: PurchasesPackage) => {
    await purchasePackage(pkg);
    if (isPro) onClose();
  };

  const Feature = ({ icon, title, description }: { icon: any, title: string, description: string }) => (
    <View style={styles.featureRow}>
      <View style={[styles.iconBox, { backgroundColor: colors.surface1 }]}>
        <Ionicons name={icon} size={24} color={colors.mauve} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemeText variant="body" style={{ fontWeight: 'bold' }}>{title}</ThemeText>
        <ThemeText variant="caption" colorKey="subtext0">{description}</ThemeText>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.content, { backgroundColor: colors.base }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.subtext0} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.header}>
              <View style={[styles.logoBox, { backgroundColor: colors.mauve }]}>
                <Ionicons name="flash" size={40} color={colors.base} />
              </View>
              <ThemeText variant="h1" style={{ marginTop: 16 }}>Chronopop Pro</ThemeText>
              <ThemeText variant="body" colorKey="subtext0" style={{ textAlign: 'center', marginTop: 8 }}>
                The ultimate precision experience for your focus and routines.
              </ThemeText>
            </View>

            <View style={styles.featuresList}>
              <Feature 
                icon="infinite" 
                title="Unlimited Everything" 
                description="Create as many Alarms, Timers, and Stopwatches as you need." 
              />
              <Feature 
                icon="cloud-done" 
                title="Cloud Synchronization" 
                description="Keep your data in sync across all your devices in real-time." 
              />
              <Feature 
                icon="color-palette" 
                title="Premium Themes" 
                description="Unlock all Catppuccin flavors: Mocha, Macchiato, and Frappé." 
              />
              <Feature 
                icon="notifications-off" 
                title="Ad-Free Experience" 
                description="Focus purely on your time without interruptions or banners." 
              />
              <Feature 
                icon="musical-notes" 
                title="Premium Soundscapes" 
                description="Exclusive alarm sounds and haptic feedback patterns." 
              />
            </View>

            <View style={styles.pricingSection}>
              {offerings?.current?.availablePackages.map((pkg) => (
                <TouchableOpacity 
                  key={pkg.identifier}
                  style={[styles.buyBtn, { backgroundColor: colors.mauve, marginBottom: 12 }]} 
                  onPress={() => handlePurchase(pkg)}
                >
                  <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>
                    {pkg.product.title.replace(' (Chronopop)', '')} – {pkg.product.priceString}
                  </ThemeText>
                </TouchableOpacity>
              ))}

              {!offerings?.current && (
                <>
                  <TouchableOpacity style={[styles.buyBtn, { backgroundColor: colors.mauve, opacity: 0.5 }]} disabled>
                    <ThemeText variant="body" colorKey="base">Loading offerings...</ThemeText>
                  </TouchableOpacity>
                </>
              )}
              
              <TouchableOpacity style={styles.restoreBtn} onPress={restorePurchases}>
                <ThemeText variant="caption" colorKey="subtext0" style={{ fontWeight: 'bold' }}>Restore Purchases</ThemeText>
              </TouchableOpacity>
              
              <ThemeText variant="caption" colorKey="subtext1" style={{ textAlign: 'center', marginTop: 16 }}>
                Subscriptions auto-renew. Lifetime is a one-time payment. Cancel anytime.
              </ThemeText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    height: '92%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  featuresList: {
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pricingSection: {
    marginTop: 24,
  },
  buyBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  }
});
