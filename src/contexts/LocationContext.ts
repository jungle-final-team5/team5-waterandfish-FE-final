import { createContext, useContext, useState } from "react";

type LocationState = {
    location: string;
    setLocation: (location: string) => void;
};

const LocationContext = createContext<LocationState | null>(null);

export default LocationContext;

export const useLocationContext = () => useContext(LocationContext);