import React, { useState } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: any;
}

export const DatePicker = ({ label, value, onChange, placeholder = 'DD/MM/AAAA', style }: DatePickerProps) => {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(() => {
    if (value) {
      const [day, month, year] = value.split('/');
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date();
  });

  const onDateChange = (_: any, selectedDate: Date | undefined) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      onChange(format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }));
    }
  };

  const showDatepicker = () => {
    setShow(true);
  };

  return (
    <View style={style}>
      <Text style={{ fontSize: 14, color: '#94a3b8', marginBottom: 8 }}>{label}</Text>
      <TouchableOpacity onPress={showDatepicker}>
        <TextInput
          value={value}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            marginBottom: 8,
            height: 48,
          }}
          mode="flat"
          placeholder={placeholder}
          editable={false}
          right={<TextInput.Icon icon="calendar" />}
        />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}; 