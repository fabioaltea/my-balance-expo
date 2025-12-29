import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from '@/components/card';
import BalanceCard from '@/components/cards/balance-card';
import MovementsCard from '@/components/cards/movements-card';
import ScreenView from '@/layout/screen-view';
import HomeView from '@/views/home-view';
import React from 'react';
import GlassButton from '@/components/ui/glass-button';
import Chips from '@/components/ui/chips';
import AccountPicker from '@/components/ui/account-picker';
import { IAccount, MOCK_ACCOUNTS } from '@/models/Account';




export const ACCOUNTS: IAccount[] = MOCK_ACCOUNTS;


export default function Home() {


  const [selectedAccount, setSelectedAccount] = React.useState("Intesa San Paolo");

  const handleButtonPress = () => {
    router.push('/add');
  };
  
  return (
    <ScreenView>
      <View style={styles.header}>
        <AccountPicker accounts={ACCOUNTS} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} ></AccountPicker>
        <GlassButton onPress={handleButtonPress}></GlassButton>
      </View>
      <HomeView accounts={ACCOUNTS} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount} />
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal:16,
    marginBottom:20,
    display:'flex',
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center'
  }});
