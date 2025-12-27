import { View, StyleSheet } from "react-native";
import ChipButton from "./chip-button";
import { useState } from "react";

const PeriodPicker: React.FC=()=>{
    const granularity=[{
        label:"Weeks",
        options:["1/52","2/52","3/52","4/52","5/52","6/52",]
    },
    {
        label:"Months",
        options:["January","February","March","April","May","June","July","August","September","October","November","December"],
    },
    {
        label:"Years",
        options:["2020","2021","2022","2023","2024","2025"],
    }];
    const [selected, setSelected] = useState<string | null>("Months");
    return <View style={styles.wrapper}>
    {granularity.map((gran)=>(
        <ChipButton text={gran.label} key={gran.label} active={selected === gran.label} onPress={() => setSelected(gran.label)} options={gran.options}></ChipButton>
    ))}
    </View>;
}

const styles=StyleSheet.create({
    wrapper:{
        display:"flex",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom:20,
        gap:10
    },
    chip:{

    }
});

export default PeriodPicker;