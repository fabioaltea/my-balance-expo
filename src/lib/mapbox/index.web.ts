import React from "react";
import { View } from "react-native";

const noop = () => {};

const MapboxStub = {
  setAccessToken: noop,
  StyleURL: {
    Dark: "dark",
    Light: "light",
  },
  MapView: View,
  Camera: React.forwardRef(() => null),
  PointAnnotation: View,
};

export default MapboxStub;
