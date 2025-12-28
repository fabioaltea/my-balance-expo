import React from "react";
import { View, StyleSheet } from "react-native";

interface IListProps{
  children: React.ReactNode;
}

const styles=StyleSheet.create({
    item:{
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        paddingVertical: 6,
        paddingHorizontal:12,
    },
    lastItem:{
        borderBottomWidth:0
    }
})

const List:React.FC<IListProps>=({children})=>{
    return (<View>
        {children && Array.isArray(children) && children.map((child, index)=>(
            <View key={index} style={[styles.item, index == children.length - 1 && styles.lastItem]}>
                {child}
            </View>
        ))}
    </View>);
}

export default List;