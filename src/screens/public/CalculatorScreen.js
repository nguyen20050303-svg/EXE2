import React, { useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CalculatorScreen({
  onAttemptUnlock,
  biometricEnabled,
  onBiometricUnlock,
  onOpenHiddenSettings,
}) {
  const [displayValue, setDisplayValue] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [rawInputBuffer, setRawInputBuffer] = useState('');

  const handleNumberInput = (numStr) => {
    // Lưu vào buffer bí mật
    setRawInputBuffer((prev) => prev + numStr);

    if (waitingForNewValue) {
      setDisplayValue(numStr);
      setWaitingForNewValue(false);
    } else {
      setDisplayValue((prev) => (prev === '0' ? numStr : prev + numStr));
    }
  };

  const handleDot = () => {
    setRawInputBuffer((prev) => prev + '.');
    if (waitingForNewValue) {
      setDisplayValue('0.');
      setWaitingForNewValue(false);
      return;
    }
    if (!displayValue.includes('.')) {
      setDisplayValue((prev) => prev + '.');
    }
  };

  const handleClear = () => {
    setDisplayValue('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
    setRawInputBuffer('');
  };

  const handleToggleSign = () => {
    const num = parseFloat(displayValue);
    if (!isNaN(num) && num !== 0) {
      setDisplayValue(String(-num));
    }
  };

  const handlePercentage = () => {
    const num = parseFloat(displayValue);
    if (!isNaN(num)) {
      setDisplayValue(String(num / 100));
    }
  };

  const handleOperation = (op) => {
    setRawInputBuffer((prev) => prev + op);
    setPreviousValue(parseFloat(displayValue));
    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculateResult = () => {
    if (!operation || previousValue === null) return parseFloat(displayValue);
    const current = parseFloat(displayValue);
    switch (operation) {
      case '+':
        return previousValue + current;
      case '-':
        return previousValue - current;
      case '×':
        return previousValue * current;
      case '÷':
        return current === 0 ? 'Error' : previousValue / current;
      default:
        return current;
    }
  };

  const handleEquals = async () => {
    // 1. Kiểm tra mã bí mật trong buffer trước
    if (onAttemptUnlock) {
      // Thử cả rawInputBuffer và displayValue
      const modeFromBuffer = await onAttemptUnlock(rawInputBuffer);
      if (modeFromBuffer !== 'none') {
        handleClear();
        return;
      }

      const modeFromDisplay = await onAttemptUnlock(displayValue);
      if (modeFromDisplay !== 'none') {
        handleClear();
        return;
      }
    }

    // 2. Nếu không phải mã bí mật -> Thực hiện tính toán số học thật
    const result = calculateResult();
    setDisplayValue(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(true);
    setRawInputBuffer('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Secret Biometric Trigger ở góc trên */}
      <View style={styles.topBar}>
        {biometricEnabled ? (
          <TouchableOpacity style={styles.bioButton} onPress={onBiometricUnlock}>
            <Text style={styles.bioText}>◎</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Màn hình hiển thị số - Long-press 1.5s để mở Cài đặt ẩn */}
      <TouchableOpacity
        style={styles.displayContainer}
        activeOpacity={0.9}
        onLongPress={onOpenHiddenSettings}
        delayLongPress={1500}
      >
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {displayValue}
        </Text>
      </TouchableOpacity>

      {/* Bàn phím máy tính */}
      <View style={styles.keypad}>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.functionButton]} onPress={handleClear}>
            <Text style={styles.functionButtonText}>AC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.functionButton]} onPress={handleToggleSign}>
            <Text style={styles.functionButtonText}>±</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.functionButton]} onPress={handlePercentage}>
            <Text style={styles.functionButtonText}>%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.operatorButton]} onPress={() => handleOperation('÷')}>
            <Text style={styles.operatorButtonText}>÷</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('7')}>
            <Text style={styles.numberText}>7</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('8')}>
            <Text style={styles.numberText}>8</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('9')}>
            <Text style={styles.numberText}>9</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.operatorButton]} onPress={() => handleOperation('×')}>
            <Text style={styles.operatorButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('4')}>
            <Text style={styles.numberText}>4</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('5')}>
            <Text style={styles.numberText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('6')}>
            <Text style={styles.numberText}>6</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.operatorButton]} onPress={() => handleOperation('-')}>
            <Text style={styles.operatorButtonText}>−</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('1')}>
            <Text style={styles.numberText}>1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('2')}>
            <Text style={styles.numberText}>2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => handleNumberInput('3')}>
            <Text style={styles.numberText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.operatorButton]} onPress={() => handleOperation('+')}>
            <Text style={styles.operatorButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.zeroButton]} onPress={() => handleNumberInput('0')}>
            <Text style={styles.numberText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleDot}>
            <Text style={styles.numberText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.equalsButton]}
            onPress={handleEquals}
            onLongPress={onOpenHiddenSettings}
            delayLongPress={1500}
          >
            <Text style={styles.equalsButtonText}>=</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  bioButton: {
    padding: 8,
  },
  bioText: {
    color: '#333333',
    fontSize: 20,
  },
  displayContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '300',
  },
  keypad: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '400',
  },
  functionButton: {
    backgroundColor: '#A5A5A5',
  },
  functionButtonText: {
    color: '#000000',
    fontSize: 26,
    fontWeight: '500',
  },
  operatorButton: {
    backgroundColor: '#FF9F0A',
  },
  operatorButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '500',
  },
  zeroButton: {
    flex: 2.1,
    alignItems: 'flex-start',
    paddingLeft: 30,
  },
  equalsButton: {
    backgroundColor: '#FF9F0A',
  },
  equalsButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '500',
  },
});
