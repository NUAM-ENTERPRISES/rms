import React, { useEffect, useState } from 'react';
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    Platform,
} from 'react-native';
import CustomText from './CustomText';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Country = {
    name: string;
    code: string; // ISO code
    dial_code: string; // e.g. +91
    flag?: string; // emoji flag if available
    flag_url?: string; // optional image url
};

type Props = {
    value?: Country | null;
    onSelect?: (c: Country) => void;
    // optional api url to fetch countries if you don't pass a `countries` prop
    apiUrl?: string;
    countries?: Country[];
};

// Lightweight fallback scaling in case utils not present
const _moderateScale = (size: number) => size;
const _scaleWidth = (size: number) => size;
const _scaleHeight = (size: number) => size;

const CountryPicker: React.FC<Props> = ({ value = null, onSelect, apiUrl, countries }) => {
    const [visible, setVisible] = useState(false);
    const [list, setList] = useState<Country[]>(countries || []);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let mounted = true;
        const fetchCountries = async () => {
            if (countries && countries.length) return;
            if (!apiUrl) return;
            setLoading(true);
            try {
                const res = await fetch(apiUrl);
                const data = await res.json();
                if (mounted) setList(data);
            } catch (e) {
                console.warn('CountryPicker: failed to fetch countries', e);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchCountries();
        return () => { mounted = false; };
    }, [apiUrl, countries]);

    const filtered = list.filter((c) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
            c.name.toLowerCase().includes(q) ||
            c.dial_code.toLowerCase().includes(q) ||
            c.code.toLowerCase().includes(q)
        );
    });

    const renderItem = ({ item }: { item: Country }) => (
        <TouchableOpacity
            onPress={() => {
                onSelect && onSelect(item);
                setVisible(false);
            }}
            style={styles.row}
        >
            <CustomText style={styles.flag}>{item.flag ?? item.flag_url ?? ''}</CustomText>
            <CustomText style={styles.countryName}>{item.name}</CustomText>
            <CustomText style={styles.dialCode}>{item.dial_code}</CustomText>
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)}>
                <CustomText style={styles.flag}>{value?.flag ?? '🌐'}</CustomText>
                <CustomText style={styles.dialCode}>{value?.dial_code ?? '+91'}</CustomText>
                <Icon name="chevron-down" size={18} color="#64748b" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.searchRow}>
                        <Icon name="magnify" size={20} color="#64748b" />
                        <TextInput
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Search country or code"
                            style={styles.searchInput}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <CustomText style={styles.closeText}>Close</CustomText>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator />
                    ) : (
                        <FlatList
                            data={filtered}
                            keyExtractor={(i) => i.code}
                            renderItem={renderItem}
                        />
                    )}
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: _scaleWidth(8),
        paddingVertical: _scaleHeight(6),
    },
    flag: {
        fontSize: _moderateScale(18),
        marginRight: 6,
    },
    dialCode: {
        fontSize: _moderateScale(15),
        color: '#475569',
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingHorizontal: 16,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        borderBottomWidth: 1,
        borderColor: '#e2e8f0',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    closeText: {
        color: '#64748b',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#f1f5f9',
    },
    countryName: {
        flex: 1,
        marginLeft: 8,
        color: '#0f172a',
    },
});

export default CountryPicker;
