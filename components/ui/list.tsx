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
    }
})

const List:React.FC<IListProps>=({children})=>{
    return (<View>
        {children && Array.isArray(children) && children.map((child, index)=>(
            <View key={index} style={index != children.length - 1 ? styles.item : undefined}>
                {child}
            </View>
        ))}
    </View>);
}

export default List;