import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Alert, Linking, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeText } from '../components/ThemeText';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../context/SyncContext';
import { FlavorName } from '../theme/colors';

export const SettingsScreen = () => {
  const { colors, flavor, setFlavor } = useTheme();
  const { 
    syncCode, 
    isSyncActive, 
    toggleSync, 
    setSyncCode, 
    isPro, 
    restorePurchases, 
    offerings, 
    purchasePackage,
    hapticsEnabled,
    setHapticsEnabled,
    resetSyncCode
  } = useSync();
  
  const [inputCode, setInputCode] = useState('');

  const handleToggleSync = async (value: boolean) => {
    if (!isPro && value) {
      Alert.alert("Pro Required", "Cloud Sync is a Pro feature. Please upgrade to enable it.");
      return;
    }
    
    try {
      await toggleSync(value);
      if (value) {
        Alert.alert("Sync Enabled", "Your data will now be synced to the cloud. Local data will be migrated automatically.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleLinkDevice = async () => {
    if (!inputCode || inputCode.replace('-', '').length < 8) {
      return Alert.alert("Invalid Code", "Please enter a valid 8-character sync code.");
    }
    
    Alert.alert(
      "Link Device?",
      "Linking will merge your data with the target device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Link", 
          onPress: async () => {
            await setSyncCode(inputCode.toUpperCase());
            setInputCode('');
            Alert.alert("Success", "Device linked successfully!");
          }
        }
      ]
    );
  };

  const handleResetSync = () => {
    Alert.alert(
      "Reset Sync?",
      "This will generate a new sync code for this device. You will stop syncing with your current code, but your local data will remain.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            const newCode = await resetSyncCode();
            Alert.alert("Sync Reset", `New code generated: ${newCode}`);
          }
        }
      ]
    );
  };

  const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
      <ThemeText variant="caption" colorKey="subtext1" style={styles.sectionTitle}>{title.toUpperCase()}</ThemeText>
      <View style={[styles.sectionContent, { backgroundColor: colors.surface0 }]}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({ icon, title, value, onValueChange, type = 'switch', onPress, color = colors.mauve }: any) => (
    <TouchableOpacity 
      style={styles.row} 
      onPress={onPress} 
      disabled={type === 'switch'}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: colors.surface1 }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <ThemeText variant="body" style={{ flex: 1 }}>{title}</ThemeText>
      {type === 'switch' ? (
        <Switch 
          value={value} 
          onValueChange={onValueChange}
          trackColor={{ false: colors.surface2, true: color }}
          thumbColor={value ? colors.base : colors.subtext0}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.subtext1} />
      )}
    </TouchableOpacity>
  );

  const ThemeOption = ({ name, label }: { name: FlavorName, label: string }) => {
    const isSelected = flavor === name;
    return (
      <TouchableOpacity 
        style={[
          styles.themeOption, 
          { borderColor: isSelected ? colors.mauve : colors.surface2 }
        ]}
        onPress={async () => {
           const success = await setFlavor(name);
           if (!success) Alert.alert("Pro Feature", "All themes (except Latte) are Pro exclusive.");
        }}
      >
        <View style={[styles.themeDot, { backgroundColor: name === 'latte' ? '#eff1f5' : name === 'mocha' ? '#1e1e2e' : name === 'macchiato' ? '#24273a' : '#303446' }]} />
        <ThemeText variant="caption" style={{ fontWeight: isSelected ? 'bold' : 'normal' }}>{label}</ThemeText>
        {isSelected && <Ionicons name="checkmark-circle" size={16} color={colors.mauve} style={styles.checkIcon} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.base }]}>
      <View style={styles.header}>
        <ThemeText variant="h1">Settings</ThemeText>
      </View>

      <SettingSection title="Premium">
        <View style={styles.proCard}>
          <View style={[styles.proBadge, { backgroundColor: isPro ? colors.green : colors.mauve }]}>
              <Ionicons name="flash" size={16} color={colors.base} />
              <ThemeText variant="caption" colorKey="base" style={{ fontWeight: 'bold', marginLeft: 4 }}>
                {isPro ? "CHRONOPOP PRO" : "UPGRADE AVAILABLE"}
              </ThemeText>
          </View>
          <ThemeText variant="body" style={{ marginTop: 12 }}>
            {isPro ? "You have full access to all features, themes, and cloud sync." : "Unlock unlimited alarms, cloud sync, and all themes."}
          </ThemeText>
          <View style={styles.proActions}>
            {!isPro && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: colors.mauve }]}
                onPress={() => purchasePackage(offerings?.current?.availablePackages[0] as any)}
              >
                <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>View Plans</ThemeText>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionBtn, { borderBottomWidth: 0 }]} 
              onPress={restorePurchases}
            >
              <ThemeText variant="body" colorKey="mauve">Restore Purchases</ThemeText>
            </TouchableOpacity>
          </View>
        </View>
      </SettingSection>

      <SettingSection title="Cloud Sync">
        <SettingRow 
           icon="cloud-upload-outline" 
           title="Enable Cloud Sync" 
           value={isSyncActive} 
           onValueChange={handleToggleSync}
           color={colors.sky}
        />
        <View style={styles.syncInfo}>
          <ThemeText variant="caption" colorKey="subtext0">YOUR SYNC CODE</ThemeText>
          <ThemeText variant="h2" colorKey="sky" selectable style={styles.syncCodeText}>{syncCode}</ThemeText>
          <ThemeText variant="caption" colorKey="subtext1" style={{ textAlign: 'center' }}>
            Use this code to link other devices. Anyone with this code can access your data.
          </ThemeText>
        </View>
        
        <View style={styles.linkBox}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface1, color: colors.text }]}
            placeholder="Enter Sync Code"
            placeholderTextColor={colors.subtext0}
            value={inputCode}
            onChangeText={setInputCode}
            autoCapitalize="characters"
            maxLength={9}
          />
          <TouchableOpacity 
            style={[styles.linkBtn, { backgroundColor: colors.sky }]} 
            onPress={handleLinkDevice}
          >
            <ThemeText variant="body" colorKey="base" style={{ fontWeight: 'bold' }}>Link</ThemeText>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' }}
          onPress={handleResetSync}
        >
          <ThemeText variant="caption" colorKey="red">RESET SYNC / GENERATE NEW CODE</ThemeText>
        </TouchableOpacity>
      </SettingSection>

      <SettingSection title="Appearance">
        <View style={styles.themeGrid}>
          <ThemeOption name="latte" label="Latte" />
          <ThemeOption name="frappe" label="Frappé" />
          <ThemeOption name="macchiato" label="Macchiato" />
          <ThemeOption name="mocha" label="Mocha" />
        </View>
      </SettingSection>

      <SettingSection title="General">
        <SettingRow 
          icon="notifications-outline" 
          title="Notification Settings" 
          type="button" 
          onPress={() => Platform.OS === 'ios' ? Linking.openURL('app-settings:') : Linking.openSettings()}
        />
        <SettingRow 
          icon="finger-print-outline" 
          title="Haptic Feedback" 
          value={hapticsEnabled} 
          onValueChange={setHapticsEnabled}
          color={colors.pink}
        />
      </SettingSection>

      <SettingSection title="About">
        <View style={styles.aboutRow}>
          <ThemeText variant="body">Version</ThemeText>
          <ThemeText variant="body" colorKey="subtext0">1.0.0 (Gold)</ThemeText>
        </View>
        <View style={styles.aboutRow}>
          <ThemeText variant="body">Build</ThemeText>
          <ThemeText variant="body" colorKey="subtext0">Production</ThemeText>
        </View>
      </SettingSection>

      <View style={styles.footer}>
        <ThemeText variant="caption" colorKey="subtext1">Made with ♡ by Studio Tun</ThemeText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 64,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginLeft: 24,
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  proCard: {
    padding: 20,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  proActions: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  syncInfo: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  syncCodeText: {
    letterSpacing: 4,
    marginVertical: 12,
  },
  linkBox: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkBtn: {
    marginLeft: 12,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  themeOption: {
    width: '44%',
    margin: '3%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },
  themeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  }
});
