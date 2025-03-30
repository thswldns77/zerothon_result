import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import axios from 'axios';
import { auth } from './firebaseConfig.js';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import {db} from './firebaseConfig.js';
import {doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, addDoc} from 'firebase/firestore';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';


import trashBins from './assets/trashBins.json';
import Svg, { Path } from 'react-native-svg';
import trashbin_image from "./assets/trashbin_image.png";
import cup_image from "./assets/cup_image.png";
import recycle_image from "./assets/recycle_image-removebg-preview.png";
import earth_image from "./assets/save_earth.webp";

import { MaterialIcons } from '@expo/vector-icons';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
primary: '#076448',
secondary: '#049d34',
background: '#e1f5c4',
white: '#FFFFFF',
gray: '#9E9E9E',
};

const { width } = Dimensions.get('window');
const tabBarWidth = width / 3;
const tabBarLeft = (width - tabBarWidth) / 2;


function LoginScreen({ navigation }) {
const [email, setEmail] = useState('qwer@gmail.com');
const [password, setPassword] = useState('123456');
const handleLogin = async () => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('✅ 로그인 성공!');
  } catch (error) {
    console.error(error);
    alert(`로그인 실패: ${error.message}`);
  }
};

return (
  <View style={styles.container}>
    <Image source={earth_image} style={styles.imageStyle} />
    <Text style={styles.title}>RecyCup</Text>
    <View style={styles.card}>
      <TextInput style={styles.input} placeholder="이메일" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="비밀번호" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>로그인</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={{ marginTop: 10, color: COLORS.gray }}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>
    </View>
  </View>
);
}


function RegisterScreen({ navigation }) {
const [nickname, setNickname] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

const handleRegister = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("회원가입 성공!");
    await setDoc(doc(db, "users", email), {
      email: email,
      mileage: 0,
      authCount: 0,
      nickname: nickname,
    });
  }
  catch (error) {
    console.error(error);
    alert('회원가입 실패');
  }
};

return (
  <View style={styles.container}>
    <Text style={styles.title}>회원가입</Text>
    <View style={styles.card}>
      <TextInput
        style={styles.input}
        placeholder="이메일"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="비밀번호"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="닉네임"
        value={nickname}
        onChangeText={setNickname}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>가입하기</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={{ marginTop: 10, color: COLORS.gray }}>이미 계정이 있으신가요? 로그인</Text>
      </TouchableOpacity>
    </View>
  </View>
);
}



function UploadScreen() {
const [cupImage, setCupImage] = useState(null);
const [trashbinImage, setTrashbinImage] = useState(null);
const [predictResult, setPredictResult] = useState(null);
const [detectResult, setDetectResult] = useState(null);
const [emptyCupCount, setEmptyCupCount] = useState(0);
const [detectedCupCount, setDetectedCupCount] = useState(0);
const [loading, setLoading] = useState(false);

const pickImage = async (type) => {
  let result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    const uri = result.assets[0].uri;
    if (type === 'cup') {
      setCupImage(uri);
      await callPredictAPI(uri);
    } else {
      setTrashbinImage(uri);
      await callDetectAPI(uri);
    }
  }
};

const callPredictAPI = async (uri) => {
  setLoading(true);
  setPredictResult(null);

  const filename = uri.split('/').pop();
  const type = 'image/jpeg';
  const formData = new FormData();
  formData.append('file', { uri, name: filename, type });

  try {
    const response = await fetch("http://192.168.0.2:5000/predict", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const json = await response.json();
    setPredictResult(`예측 결과: ${json.result} (${(json.probability * 100).toFixed(1)}%)`);

    if (json.result === "empty") setEmptyCupCount(1);
    else setEmptyCupCount(0);
  } catch (error) {
    setPredictResult("⚠️ API 호출 중 오류 발생");
  } finally {
    setLoading(false);
  }
};

const callDetectAPI = async (uri) => {
  setLoading(true);
  setDetectResult(null);

  const filename = uri.split('/').pop();
  const type = 'image/jpeg';
  const formData = new FormData();
  formData.append('image', { uri, name: filename, type });

  try {
    const response = await fetch("http://192.168.0.2:5000/detect", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const json = await response.json();
    setDetectResult(`탐지 결과: ${json.detected ? "탐지됨" : "탐지 안됨"}`);

    if (json.detected) {
      setDetectedCupCount(1);
    } else {
      setDetectedCupCount(0);
    }
  } catch (error) {
    setDetectResult("⚠️ API 호출 중 오류 발생");
  } finally {
    setLoading(false);
  }
};

const handleUpload = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("로그인 정보가 없습니다. 다시 로그인해주세요.");
    return;
  }

  if (detectedCupCount && emptyCupCount) {
    try {
      // 현재 위치 가져오기
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
            
      const userRef = doc(db, "users", user.email);

      await updateDoc(userRef, {
        mileage: increment(10),
        authCount: increment(1),
      });

      const certRef = collection(userRef, "certifications");
      await addDoc(certRef, {
        date: new Date(),
        type: "컵 인증",
        points: 10,
      });
// 사용자 위치 Firestore에 저장
      const certRefposition = collection(userRef, "certifications");
       addDoc(certRefposition, {
          lat: latitude,
          lng: longitude,
          timestamp: new Date(),
        });
      alert('인증성공! 마일리지 10점 적립');
      setCupImage(null);
      setTrashbinImage(null);
      setDetectedCupCount(0);
      setEmptyCupCount(0);
      setPredictResult(null);
      setDetectResult(null);
    } catch (error) {
      console.error("마일리지/기록 저장 실패:", error);
      alert("인증은 성공했지만 데이터 저장에 실패했습니다.");
    }
  } else if (detectedCupCount === 0) {
    alert("빈컵이 인식되지 않았습니다.");
  } else if (emptyCupCount === 0) {
    alert("쓰레기통이 인식되지 않았습니다.");
  } else {
    alert("두 사진 모두 인식되지 않았습니다.");
  }
};

const renderStatus = () => {
  return (
    <View style={styles.statusContainer}>
      <View style={styles.statusItem}>
        <View style={[styles.statusIndicator, { backgroundColor: emptyCupCount ? '#4CAF50' : '#E0E0E0' }]}>
          <Ionicons name={emptyCupCount ? "checkmark" : "close"} size={20} color="white" />
        </View>
        <Text style={styles.statusText}>빈 컵 인식</Text>
      </View>
      <View style={styles.statusItem}>
        <View style={[styles.statusIndicator, { backgroundColor: detectedCupCount ? '#4CAF50' : '#E0E0E0' }]}>
          <Ionicons name={detectedCupCount ? "checkmark" : "close"} size={20} color="white" />
        </View>
        <Text style={styles.statusText}>쓰레기통 인식</Text>
      </View>
    </View>
  );
};

return (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>컵 재활용 인증</Text>

    {/* 진행 상태 표시 */}
    {renderStatus()}

    {/* 사진 미리보기 영역 */}
    <View style={styles.previewContainer}>
      <TouchableOpacity
        style={[styles.previewCard, cupImage ? styles.previewCardWithImage : {}]}
        onPress={() => pickImage('cup')}
      >
        {cupImage ? (
          <Image source={{ uri: cupImage }} style={styles.previewImage} />
        ) : (
          <>
            <MaterialIcons name="photo-camera" size={32} color="#4CAF50" />
            <Text style={styles.previewText}>빈 컵 촬영하기</Text>
          </>
        )}
        {predictResult && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>{emptyCupCount ? "인식 완료" : "미인식"}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.previewCard, trashbinImage ? styles.previewCardWithImage : {}]}
        onPress={() => pickImage('trashbin')}
      >
        {trashbinImage ? (
          <Image source={{ uri: trashbinImage }} style={styles.previewImage} />
        ) : (
          <>
            <MaterialIcons name="photo-camera" size={32} color="#4CAF50" />
            <Text style={styles.previewText}>쓰레기통 촬영하기</Text>
          </>
        )}
        {detectResult && (
          <View style={styles.resultBadge}>
            <Text style={styles.resultText}>{detectedCupCount ? "인식 완료" : "미인식"}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>

    {/* 인증 버튼 */}
    <TouchableOpacity
      style={[
        styles.certifyButton,
        (detectedCupCount && emptyCupCount) ? styles.certifyButtonActive : styles.certifyButtonInactive
      ]}
      onPress={handleUpload}
      disabled={!(detectedCupCount && emptyCupCount)}
    >
      {loading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <>
          <MaterialIcons name="check-circle" size={24} color="white" />
          <Text style={styles.certifyButtonText}>인증하기</Text>
        </>
      )}
    </TouchableOpacity>

    {/* 인증 설명 */}
    <View style={styles.instructionContainer}>
      <Text style={styles.instructionTitle}>인증 방법</Text>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>1</Text>
        </View>
        <Text style={styles.instructionText}>빈 컵을 깨끗이 헹궈주세요</Text>
      </View>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>2</Text>
        </View>
        <Text style={styles.instructionText}>빈 컵 사진을 찍어주세요</Text>
      </View>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>3</Text>
        </View>
        <Text style={styles.instructionText}>컵을 분리수거함에 버리는 사진을 찍어주세요</Text>
      </View>
      <View style={styles.instructionItem}>
        <View style={styles.instructionNumber}>
          <Text style={styles.instructionNumberText}>4</Text>
        </View>
        <Text style={styles.instructionText}>인증 완료 후 10 마일리지를 받으세요!</Text>
      </View>
    </View>
  </ScrollView>
);
}

function MapScreen(){
  const mapRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null);
  const [myTrashPoints, setMyTrashPoints] = useState([]);

  const getMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('위치 권한이 필요합니다.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = location.coords;

    setMyLocation({ latitude, longitude });

    mapRef.current.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003,
    }, 500); // 500ms 동안 부드럽게 이동
  };


  // 2) Firestore에서 사용자 인증 위치 불러오는 함수
  const fetchUserTrashPoints = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("사용자 정보 없음");
        return;
      }
      const userRef = doc(db, "users", currentUser.email);
      const certRef = collection(userRef, "certifications");
      
      const snap = await getDocs(certRef);
      const points = snap.docs.map(doc => doc.data());
      setMyTrashPoints(points);

    } catch (error) {
      console.error("🔥 사용자 인증 위치 불러오기 실패:", error);
    }
  };
  // 3) 화면이 포커스될 때마다 fetchUserTrashPoints 실행
  useFocusEffect(
    useCallback(() => {
      fetchUserTrashPoints();
    }, [])
  );
  

  const initialRegion = {
    latitude: 37.5169,
    longitude: 126.8664,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={styles.container_map}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {trashBins.map((bin, index) => (
          <Marker
            key={index}
            coordinate={{
              latitude: parseFloat(bin.latitude),
              longitude: parseFloat(bin.longitude),
            }}
            title={bin.name}
          />
        ))}
        {myTrashPoints.map((point, idx) => (
          <Marker
            key={`cert-${idx}`}
            coordinate={{
              latitude: parseFloat(point.lat),
              longitude: parseFloat(point.lng)
            }}
            title="인증한 쓰레기통"
            pinColor="yellow"
          />
        ))}
       
        {myLocation && (
          <Marker
            coordinate={myLocation}
            title="내 위치"
            pinColor="blue"
          />
        )}
      </MapView>

      <TouchableOpacity style={styles.locationBtn} onPress={getMyLocation}>
        <Text style={styles.btnText}>📍 내 위치 찾기</Text>
      </TouchableOpacity>
    </View>
  );

}

function MyPageScreen() {
const [email, setEmail] = useState('');
const [authCount, setAuthCount] = useState(0);
const [mileage, setMileage] = useState(0);
const [nickname, setNickname] = useState('');
const [level, setLevel] = useState('새싹');
const [badgeImage, setBadgeImage] = useState(null);
const [history, setHistory] = useState([]);

// 인증 횟수에 따른 레벨 변경 로직
useFocusEffect(
  useCallback(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.email);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEmail(data.email);
            setAuthCount(data.authCount);
            setMileage(data.mileage);
            setNickname(data.nickname);
            setHistory(data.certifications || []);
            const certRef = collection(db, 'users', user.email, 'certifications');
            const snapshot = await getDocs(certRef);
            const records = snapshot.docs.map(doc => doc.data());
            setHistory(records);
          } else {
            console.log("사용자 데이터가 존재하지 않습니다.");
          }
        } catch (error) {
          console.error('사용자 정보 불러오기 오류:', error);
        }
      }
    };

    fetchUserData();
  }, [])
);

useEffect(() => {
  if (authCount >= 15) {
    setLevel('열매');
    setBadgeImage(require('./assets/badge_fruit.png'));
  } else if (authCount >= 5) {
    setLevel('나무');
    setBadgeImage(require('./assets/badge_tree.png'));
  } else {
    setLevel('새싹');
    setBadgeImage(require('./assets/badge_seed.png'));
  }
}, [authCount]);

const handleLogout = async () => {
  try {
    await signOut(auth);
    alert("로그아웃 되었습니다.");
  } catch (error) {
    console.error('로그아웃 실패:', error);
  }
};

// 레벨에 따른 색상 결정 함수
const getLevelColor = () => {
  switch (level) {
    case '새싹': return '#4CAF50';
    case '나무': return '#2E7D32';
    case '열매': return '#FF9800';
    default: return '#ddd';
  }
};

// 레벨에 따른 너비 결정 함수
const getLevelWidth = () => {
  switch (level) {
    case '새싹': return '33%';
    case '나무': return '66%';
    case '열매': return '100%';
    default: return '0%';
  }
};

return (
  <ScrollView contentContainerStyle={styles.container}>
    {/* 프로필 헤더 */}
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.userInfo}>
          <Text style={styles.greetingText}>안녕하세요,</Text>
          <Text style={styles.nickname}>{nickname}님 👋</Text>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { color: getLevelColor() }]}>{level}</Text>
          </View>
        </View>
        {badgeImage && (
          <Image source={badgeImage} style={styles.badgeImage} />
        )}
      </View>
    </View>

    {/* 원형 진행 표시기 */}
    <View style={styles.progressSection}>
      <HalfCircleProgress
        percentage={Math.min(authCount * 5, 100)}
        color={getLevelColor()}
        size={180}
        strokeWidth={15}
      />
      <Text style={styles.progressText}>{authCount}회 인증</Text>
    </View>

    {/* 사용자 정보 카드 */}
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>사용자 ID</Text>
        <Text style={styles.infoValue}>{email}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>마일리지</Text>
        <Text style={styles.infoValue}>{mileage}점</Text>
      </View>
    </View>

    {/* 레벨 진행 상황 */}
    <View style={styles.levelCard}>
      <Text style={styles.sectionTitle}>레벨 현황</Text>
      <View style={styles.levelProgressContainer}>
        <View
          style={[
            styles.levelProgress,
            {
              backgroundColor: getLevelColor(),
              width: getLevelWidth(),
            },
          ]}
        />
      </View>
      <View style={styles.levelLabels}>
        <Text style={styles.levelLabelText}>새싹</Text>
        <Text style={styles.levelLabelText}>나무</Text>
        <Text style={styles.levelLabelText}>열매</Text>
      </View>
    </View>

    {/* 활동 기록 섹션 */}
    <View style={styles.historySection}>
      <Text style={styles.sectionTitle}>활동 기록</Text>
      {history.length > 0 ? (
        history.map((item, index) => (
          <View key={index} style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyType}>{item.type}</Text>
              <Text style={styles.historyPoints}>+{item.points}점</Text>
            </View>
            <Text style={styles.historyDate}>
              {(() => {
                try {
                  const dateObj = item.date?.toDate?.() ?? new Date(item.date);
                  if (isNaN(dateObj.getTime())) return '날짜 정보 없음';
                  const year = dateObj.getFullYear();
                  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                  const date = String(dateObj.getDate()).padStart(2, '0');
                  const hours = String(dateObj.getHours()).padStart(2, '0');
                  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                  return `${year}.${month}.${date} ${hours}:${minutes}`;
                } catch {
                  return '날짜 정보 없음';
                }
              })()}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyHistory}>아직 활동 기록이 없습니다.</Text>
      )}
    </View>

    {/* 로그아웃 버튼 */}
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Text style={styles.logoutButtonText}>로그아웃</Text>
    </TouchableOpacity>
  </ScrollView>
);
}

function HalfCircleProgress({ percentage = 70, size = 200, strokeWidth = 20, color = '#4CAF50' }) {
const radius = size / 2 - strokeWidth / 2; // ✅ stroke 반영
const centerX = size / 2;
const centerY = size / 2;
const angle = (percentage / 100) * Math.PI;

const x = centerX + radius * Math.cos(Math.PI - angle);
const y = centerY - radius * Math.sin(Math.PI - angle);
const largeArcFlag = percentage > 50 ? 1 : 0;

const backgroundPath = `
  M ${centerX - radius},${centerY}
  A ${radius},${radius} 0 1 1 ${centerX + radius},${centerY}
`;

const progressPath = `
  M ${centerX - radius},${centerY}
  A ${radius},${radius} 0 ${largeArcFlag} 1 ${x},${y}
`;

return (
  <View style={{ alignItems: 'center', marginVertical: 20 }}>
    <Svg width={size} height={size / 2}>
      <Path
        d={backgroundPath}
        stroke="#e0e0e0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Path
        d={progressPath}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
    <Text style={{ color: color, fontSize: 16, fontWeight: '600', marginTop: 10 }}>
      {percentage}% 완료
    </Text>
  </View>
);
}


function MainTabs() {
  const { width } = Dimensions.get('window');
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
      <Tab.Screen name="쓰레기통 지도" component={MapScreen}/>
      <Tab.Screen name="인증" component={UploadScreen} />
      <Tab.Screen name="마이페이지" component={MyPageScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
const [user, setUser] = useState(undefined); // null이 아니라 undefined로 초기화
const [loading, setLoading] = useState(true);

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user); // user가 null이면 로그인 안된 상태
    setLoading(false);
  });

  return unsubscribe;
}, []);

if (user === undefined) {
  // 아직 초기 로그인 상태를 파악 중일 때
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>앱 로딩중...</Text>
    </View>
  );
}

return (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
}


export function CustomTabBar({ state, descriptors, navigation }) {
return (
  <View style={styles.tabBar}>
    {state.routes.map((route, index) => {
      const isFocused = state.index === index;

      let iconName;
      switch (route.name) {
        case '인증':
          iconName = isFocused ? 'camera' : 'camera-outline';
          break;
        case '마이페이지':
          iconName = isFocused ? 'person' : 'person-outline';
          break;
        case '지도':
          iconName = isFocused ? 'map' : 'map-outline';
          break;
        default:
          iconName = 'alert-circle';
      }

      const onPress = () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      return (
        <TouchableOpacity
          key={route.key}
          onPress={onPress}
          style={styles.tabButton}
        >
          <Ionicons name={iconName} size={22} color={isFocused ? '#4CAF50' : '#9E9E9E'} />
        </TouchableOpacity>
      );
    })}
  </View>
);
} 


const styles = StyleSheet.create({
container_map: {
  flex: 1,
  justifyContent: 'flex-end',
  alignItems: 'center',
},
map: {
  ...StyleSheet.absoluteFillObject,
},
locationBtn: {
  position: 'absolute',
  bottom: 30,
  backgroundColor: '#4CAF50',
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 20,
},
btnText: {
  color: 'white',
  fontWeight: 'bold',
},

container: {
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
  backgroundColor: COLORS.background,
},
title: {
  fontSize: 28,
  fontWeight: 'bold',
  marginBottom: 20,
  color: COLORS.primary,
},
card: {
  width: '100%',
  backgroundColor: COLORS.white,
  padding: 20,
  borderRadius: 15,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 5,
},
input: {
  backgroundColor: COLORS.white,
  paddingHorizontal: 15,
  paddingVertical: 12,
  borderRadius: 8,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: COLORS.gray,
},
button: {
  backgroundColor: COLORS.primary,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: 'center',
},

buttonText: {
  color: COLORS.white,
  fontWeight: 'bold',
},
button_recycle: {
  backgroundColor: COLORS.background,
  padding: 15,
  borderRadius: 10,
  alignItems: 'center',
  marginTop: 10,
},
button_recycleText: {
  color: COLORS.primary,
  fontWeight: 'bold',
},
imageStyle: {
  width: 150,
  height: 150,
  marginRight: 10,
  borderRadius: 75, // 원형 모양
  shadowColor: "#000", // 기본 그림자 색상
  shadowOffset: { width: 2, height: 4 }, // 그림자 위치
  shadowOpacity: 0.3, // 그림자 투명도
  shadowRadius: 6, // 그림자 반경
  elevation: 8, // 안드로이드에서 그림자 효과

  overflow: 'hidden', // 이미지가 원 밖으로 나가지 않도록 설정
  // 더 많은 입체감을 주기 위한 추가 효과
  backgroundColor: COLORS.white, // 배경 색상 (하이라이트를 더 잘 보이게 함)
  borderColor: "#e1f5c4", // 밝은 색으로 테두리 설정
  borderWidth: 3, // 테두리 두께
  // padding: 10, // 원 안의 사진과 원 사이에 마진을 추가
},
imagePicker: {
  backgroundColor: COLORS.background,
  padding: 15,
  borderRadius: 10,
  marginVertical: 10,
  alignItems: 'center',
},
imagePickerText: {
  color: COLORS.primary,
  fontWeight: 'bold',
},
previewImage: {
  width: '100%',
  height: 120,
  borderRadius: 10,
  marginTop: 10,
  resizeMode: 'cover',
},
profileContainer: {
  width: '100%',
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 10,
  marginBottom: 20,
},
profileText: {
  fontSize: 16,
  marginBottom: 10,
},
levelContainer: {
  width: '100%',
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 10,
},
levelTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 10,
},
levelProgressContainer: {
  height: 20,
  backgroundColor: '#e0e0e0',
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: 10,
},
levelProgress: {
  height: '100%',
  borderRadius: 10,
},
levelLabels: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
tabBar: {
  position: 'absolute',
  bottom: 20,
  left: tabBarLeft,
  width: tabBarWidth,
  height: 60,
  backgroundColor: 'white',
  borderRadius: 30,
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 10,
},
tabButton: {
  flex: 1,
  alignItems: 'center',
},
cardRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
cardImage: {
  width: 60,
  height: 60,
  resizeMode: 'contain',
  marginRight: 10,
},
cardContent: {
  flex: 1,
},
cardButton: {
  backgroundColor: COLORS.primary,
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 6,
  alignSelf: 'flex-start',
},
cardButtonText: {
  color: 'white',
  fontWeight: 'bold',
},
arrow: {
  width: 30,
  height: 30,
  marginVertical: 10,
  alignSelf: 'center',
},
  container: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#2E7D32',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#424242',
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  previewCard: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  previewCardWithImage: {
    borderStyle: 'solid',
    borderColor: '#4CAF50',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  previewText: {
    marginTop: 8,
    fontSize: 14,
    color: '#424242',
    textAlign: 'center',
  },
  resultBadge: {
    position: 'absolute',
    bottom: -10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
  },
  resultText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  certifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  certifyButtonActive: {
    backgroundColor: '#4CAF50',
  },
  certifyButtonInactive: {
    backgroundColor: '#9E9E9E',
  },
  certifyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2E7D32',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: 'white',
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
container: {
  flexGrow: 1,
  padding: 20,
  backgroundColor: '#f8f9fa',
},
header: {
  marginBottom: 20,
},
headerContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
userInfo: {
  flex: 1,
},
greetingText: {
  fontSize: 16,
  color: '#666',
},
nickname: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 4,
},
levelBadge: {
  alignSelf: 'flex-start',
  paddingVertical: 4,
  paddingHorizontal: 10,
  borderRadius: 12,
  backgroundColor: '#f0f0f0',
  marginTop: 4,
},
levelText: {
  fontSize: 14,
  fontWeight: 'bold',
},
badgeImage: {
  width: 70,
  height: 70,
  resizeMode: 'contain',
},
progressSection: {
  alignItems: 'center',
  marginVertical: 20,
},
progressText: {
  marginTop: 10,
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
},
infoCard: {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 15,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 10,
},
infoLabel: {
  fontSize: 16,
  color: '#666',
},
infoValue: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
},
divider: {
  height: 1,
  backgroundColor: '#eee',
  marginVertical: 5,
},
levelCard: {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 15,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
  marginBottom: 15,
},
levelProgressContainer: {
  height: 12,
  backgroundColor: '#f0f0f0',
  borderRadius: 6,
  overflow: 'hidden',
  marginBottom: 10,
},
levelProgress: {
  height: '100%',
  borderRadius: 6,
},
levelLabels: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingHorizontal: 5,
},
levelLabelText: {
  fontSize: 14,
  color: '#666',
},
historySection: {
  marginBottom: 20,
},
historyCard: {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 15,
  marginBottom: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
},
historyHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},
historyType: {
  fontSize: 16,
  fontWeight: '500',
  color: '#333',
},
historyPoints: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#4CAF50',
},
historyDate: {
  fontSize: 14,
  color: '#666',
},
emptyHistory: {
  textAlign: 'center',
  color: '#999',
  padding: 20,
},
logoutButton: {
  backgroundColor: '#f44336',
  paddingVertical: 15,
  borderRadius: 12,
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 30,
},
logoutButtonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: 'bold',
},
});