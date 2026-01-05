import { View, StyleSheet } from "react-native";
import ChipButton from "./chip-button";
import { useState, useMemo } from "react";
import React from "react";
import { formatDateToDDMMYYYY } from "@/utils/dateUtils";
import type { IDateRange } from "@/state";

function monthStartEnd(year: number, monthIndex: number) {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
        start: formatDateToDDMMYYYY(start),
        end: formatDateToDDMMYYYY(end)
    };
}

interface PeriodPickerProps {
    dateRange: IDateRange;
    setDateRange: (range: IDateRange) => void;
    movementFilter: "all" | "income" | "expense";
    setMovementFilter: (filter: "all" | "income" | "expense") => void;
}

const PeriodPicker: React.FC<PeriodPickerProps> = ({ dateRange, setDateRange, movementFilter, setMovementFilter }) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months = useMemo(
        () => [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December",
        ],
        []
    );
    const currentMonthName = months[now.getMonth()];
    const currentMonthIndex = now.getMonth();

    const [selected, setSelected] = useState<string | null>("Months");
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthName);

    const filterOptions = useMemo(() => ["All", "Income", "Expense"], []);

    const availableMonths = useMemo(() => {
        if (selectedYear < currentYear) {
            return months; // All months available for past years
        } else if (selectedYear === currentYear) {
            return months.slice(0, currentMonthIndex + 1); // Only months up to current month
        }
        return []; // No months available for future years
    }, [selectedYear, currentYear, currentMonthIndex, months]);

    const availableYears = useMemo(() =>
        Array.from({ length: 6 }, (_, i) => String(currentYear - i)),
        [currentYear]
    );

    const setCustomRange = (startDate: string, endDate: string, label?: string) => {
        setDateRange({
            startDate,
            endDate,
            label: label || `${startDate} - ${endDate}`,
        });
    };

    const handleFilterSelect = (opt: string) => {
        const filterMap: Record<string, "all" | "income" | "expense"> = {
            "All": "all",
            "Income": "income",
            "Expense": "expense"
        };
        setMovementFilter(filterMap[opt]);
    };

    const handleMonthSelect = (opt: string) => {
        setSelectedMonth(opt);
        const monthIndex = months.indexOf(opt);
        const { start, end } = monthStartEnd(selectedYear, monthIndex);
        setCustomRange(start, end, `${opt} ${selectedYear}`);
    };

    const handleYearSelect = (opt: string) => {
        const y = parseInt(opt, 10);
        setSelectedYear(y);

        // If currently viewing a month, update the range for that month in the new year
        if (selected === "Months") {
            const monthIndex = months.indexOf(selectedMonth);
            if (monthIndex !== -1) {
                const { start, end } = monthStartEnd(y, monthIndex);
                setCustomRange(start, end, `${selectedMonth} ${y}`);
            }
        } else {
            // If viewing year, show the entire new year
            const start = formatDateToDDMMYYYY(new Date(y, 0, 1));
            const end = formatDateToDDMMYYYY(new Date(y, 11, 31));
            setCustomRange(start, end, String(y));
        }
    };

    const currentFilterLabel = movementFilter === "all" ? "All" : movementFilter === "income" ? "Income" : "Expense";

    const handleMonthsPress = () => {
        setSelected("Months");
        // When switching to Months view, apply the currently selected month
        const monthIndex = months.indexOf(selectedMonth);
        if (monthIndex !== -1) {
            const { start, end } = monthStartEnd(selectedYear, monthIndex);
            setCustomRange(start, end, `${selectedMonth} ${selectedYear}`);
        }
    };

    const handleYearsPress = () => {
        setSelected("Years");
        // When switching to Years view, apply the entire year
        const start = formatDateToDDMMYYYY(new Date(selectedYear, 0, 1));
        const end = formatDateToDDMMYYYY(new Date(selectedYear, 11, 31));
        setCustomRange(start, end, String(selectedYear));
    };

    return (
        <View style={styles.wrapper}>
            <ChipButton
                text="Filter"
                key="Filter"
                active={selected === "Filter"}
                onPress={() => setSelected("Filter")}
                options={filterOptions}
                defaultOption={currentFilterLabel}
                onOptionSelect={handleFilterSelect}
            />
            <ChipButton
                text="Months"
                key="Months"
                active={selected === "Months"}
                onPress={handleMonthsPress}
                options={availableMonths}
                defaultOption={selectedMonth}
                onOptionSelect={handleMonthSelect}
            />
            <ChipButton
                text="Years"
                key="Years"
                active={selected === "Years"}
                onPress={handleYearsPress}
                options={availableYears}
                defaultOption={String(selectedYear)}
                onOptionSelect={handleYearSelect}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
        gap: 10
    },
    navigation: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    navButton: {
        padding: 10,
        minWidth: 40,
        alignItems: "center",
    },
    navText: {
        fontSize: 24,
        fontWeight: "bold",
    },
    periodLabel: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
        textAlign: "center",
    },
});

export default PeriodPicker;