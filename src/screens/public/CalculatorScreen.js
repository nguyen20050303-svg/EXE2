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
  onHiddenGesture,
  onOpenHiddenSettings,
}) {
  const [displayValue, setDisplayValue] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [rawInputBuffer, setRawInputBuffer] = useState('');
  const [isCalculatedResult, setIsCalculatedResult] = useState(false);

  const handleNumberInput = (numStr) => {
    setIsCalculatedResult(false);
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
    setIsCalculatedResult(false);
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
    setIsCalculatedResult(false);
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
    setIsCalculatedResult(false);
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
    // 1. Nếu đang thực hiện phép tính (+, -, ×, ÷), LUÔN tính toán số học thật để bảo vệ bí mật
    if (operation !== null && previousValue !== null) {
      const result = calculateResult();
      setDisplayValue(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
      setRawInputBuffer('');
      setIsCalculatedResult(true);
      return;
    }

    // 2. Nếu đang hiển thị kết quả của một phép tính trước đó, bấm '=' không bao giờ mở két
    if (isCalculatedResult) {
      return;
    }

    // 3. Nếu người dùng nhập dãy số trực tiếp trên máy tính sạch rồi bấm '=' -> kiểm tra mã bí mật
    if (onAttemptUnlock) {
      const modeFromDisplay = await onAttemptUnlock(displayValue);
      if (modeFromDisplay !== 'none') {
        handleClear();
        return;
      }

      if (rawInputBuffer) {
        const modeFromBuffer = await onAttemptUnlock(rawInputBuffer);
        if (modeFromBuffer !== 'none') {
          handleClear();
          return;
        }
      }
    }

    // 4. Nếu không phải mã bí mật -> hiển thị số bình thường
    const result = calculateResult();
    setDisplayValue(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(true);
    setRawInputBuffer('');
  };

  // Cử chỉ khẩn cấp: Nhấn giữ phím '=' 1.2 giây -> Luôn ép kiểm tra mở két
  const handleLongPressEquals = async () => {
    if (onAttemptUnlock) {
      const mode = await onAttemptUnlock(displayValue);
      if (mode !== 'none') {
        handleClear();
        return;
      }
      if (rawInputBuffer) {
        const modeBuf = await onAttemptUnlock(rawInputBuffer);
        if (modeBuf !== 'none') {
          handleClear();
          return;
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Secret Biometric / Hidden Gesture Trigger: Vùng chạm tàng hình ở góc trên (không để lại icon lạ) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.invisibleBioArea}
          onPress={onHiddenGesture || onBiometricUnlock}
          activeOpacity={1}
        />
      </View>

      {/* Màn hình hiển thị số - Long-press 2s để mở Cài đặt ẩn */}
      <TouchableOpacity
        style={styles.displayContainer}
        activeOpacity={0.9}
        onLongPress={onOpenHiddenSettings}
        delayLongPress={2000}
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
            onLongPress={handleLongPressEquals}
            delayLongPress={1200}
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
    minHeight: 44,
  },
  invisibleBioArea: {
    width: 60,
    height: 44,
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
