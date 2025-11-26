import FavoritesProvider from "@/lib/favorites-provider";
import GlobalProvider from "@/lib/global-provider";
import { useFonts } from "expo-font";
import { SplashScreen, Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./global.css";

export default function RootLayout() {
    const [fontsLoaded, setFontsLoaded] = useFonts({
        "Rubik-Bold": require("../assets/fonts/Rubik-Bold.ttf"),
        "Rubik-ExtraBold": require("../assets/fonts/Rubik-ExtraBold.ttf"),
        "Rubik-Light": require("../assets/fonts/Rubik-Light.ttf"),
        "Rubik-Medium": require("../assets/fonts/Rubik-Medium.ttf"),
        "Rubik-Regular": require("../assets/fonts/Rubik-Regular.ttf"),
        "Rubik-SemiBold": require("../assets/fonts/Rubik-SemiBold.ttf"),

        })
    useEffect(() => {
        if (fontsLoaded){
            SplashScreen.hideAsync();
        }
    },[fontsLoaded]);

    if (!fontsLoaded) return null;

  return(
      <GestureHandlerRootView style={{ flex: 1 }}>
          <GlobalProvider>
              <FavoritesProvider>
                  <Stack screenOptions={{headerShown: false}}/>
              </FavoritesProvider>
          </GlobalProvider>
      </GestureHandlerRootView>


  );
}
