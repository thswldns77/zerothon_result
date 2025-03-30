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
import { ProgressCircle } from 'react-native-svg-charts';


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const COLORS = {
  primary: '#4CAF50',
  secondary: '#2196F3',
  background: '#F5F5F5',
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
    try{
      await createUserWithEmailAndPassword(auth, email, password);
      alert("회원가입 성공!");
      await setDoc(doc(db, "users", email), {
        email: email,
        mileage: 0,
        authCount: 0,
        nickname: nickname,
      });
    }
    catch(error){
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
  const [emptyCupCount, setEmptyCupCount] = useState(0); // 빈 컵 카운트
  const [detectedCupCount, setDetectedCupCount] = useState(0); // 탐지된 컵 카운트
  const [loading, setLoading] = useState(0);

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
        const response = await fetch("http://172.31.98.78:5000/predict", {
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
        const response = await fetch("http://172.31.98.78:5000/detect", {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>재활용 인증</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('cup')}>
          <Text style={styles.imagePickerText}>컵 사진 찍기</Text>
          {predictResult && (
            <Text style={{ marginTop: 10, fontSize: 16, color: COLORS.gray }}>
              {predictResult}
            </Text>
          )}
        </TouchableOpacity>
        {cupImage && <Image source={{ uri: cupImage }} style={styles.previewImage} />}

        <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('trashbin')}>
          <Text style={styles.imagePickerText}>쓰레기통 사진 찍기</Text>
        </TouchableOpacity>
        {trashbinImage && <Image source={{ uri: trashbinImage }} style={styles.previewImage} />}

        <TouchableOpacity style={styles.button} onPress={handleUpload}>
          <Text style={styles.buttonText}>인증하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MapScreen(){
  const mapRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null);
  const [myTrashPoints, setMyTrashPoints] = useState([]);

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
              setHistory(records); // 👈 아래 useState에서 정의
            }
             else {
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

  useEffect(() =>{
    if(authCount >= 15){
      setLevel('열매');
      setBadgeImage('🍎');
    } else if(authCount >= 5){
      setLevel('나무');
      setBadgeImage('🌳');
    }else{
      setLevel('새싹');
      setBadgeImage('🌱');
    }
  },[authCount]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert("로그아웃 되었습니다.");
    }catch (error){
      console.error('로그아웃 실패:',error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 👤 프로필 + 뱃지 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 10,marginBottom: 10 }}>
        <View>
          <Text style={styles.nickname}>안녕하세요, {nickname}님 👋</Text>
          <Text style={styles.level}>레벨: {level}</Text>
        </View>
        {badgeImage && (
          <Image source={badgeImage} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
        )}
      </View>
      <HalfCircleProgress percentage={Math.min(authCount * 5, 100)} />
      {/* 🔢 수치 요약 */}
      <View style={styles.profileContainer}>
        <Text style={styles.profileText}>ID: {email}</Text>
        <Text style={styles.profileText}>인증 횟수: {authCount}회</Text>
        <Text style={styles.profileText}>마일리지: {mileage}점</Text>
      </View>

      {/* 🎯 레벨 Progress Bar */}
      <View style={styles.levelContainer}>
        <Text style={styles.levelTitle}>레벨 현황</Text>
        <View style={styles.levelProgressContainer}>
          <View
            style={[
              styles.levelProgress,
              {
                backgroundColor:
                  level === '새싹' ? '#4CAF50' :
                    level === '나무' ? '#2E7D32' :
                      level === '열매' ? '#FF9800' : '#ddd',
                width:
                  level === '새싹' ? '33%' :
                    level === '나무' ? '66%' : '100%',
              },
            ]}
          />
        </View>
        <View style={styles.levelLabels}>
          <Text>새싹</Text>
          <Text>나무</Text>
          <Text>열매</Text>
        </View>
      </View>
      <View style={{ width: '100%', marginTop: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>등록 기록</Text>
        <View style={{}}>
          {history.map((item, index) => (
            <View
              key={index}
              style={{
                backgroundColor: 'white',
                padding: 15,
                marginBottom: 10,
                borderRadius: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                elevation: 2,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>
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
              <Text>{item.type}</Text>
              <Text>+{item.points}점</Text>
            </View>
          ))}
        </View>
      </View>


      <TouchableOpacity style={[styles.button, { marginTop: 30 }]} onPress={handleLogout}>
        <Text style={styles.buttonText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
function HalfCircleProgress({ percentage = 70, size = 200 }) {
const radius = size / 2 - 10;
const strokeWidth = 20;
const centerX = size / 2;
const centerY = size / 2;
const angle = (percentage / 100) * Math.PI;

const x = centerX + radius * Math.cos(Math.PI - angle);
const y = centerY - radius * Math.sin(Math.PI - angle);

const largeArcFlag = percentage > 50 ? 1 : 0;

const pathData = `
  M ${centerX - radius},${centerY}
  A ${radius},${radius} 0 ${largeArcFlag} 1 ${x},${y}
`;

return (
  <View style={{ alignItems: 'center', marginVertical: 20 }}>
    <Svg width={size} height={size / 2}>
      {/* 배경 반원 */}
      <Path
        d={`
          M ${centerX - radius},${centerY}
          A ${radius},${radius} 0 1 1 ${centerX + radius},${centerY}
        `}
        stroke="#e0e0e0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* 진행 반원 */}
      <Path
        d={pathData}
        stroke="#4CAF50"
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
    <Text style={{ color: '4CAF50', fontSize: 16, fontWeight: '600', marginTop: 10 }}>
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
  container: {
    flexGrow: 1,
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
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
    padding: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  imagePicker: {
    backgroundColor: COLORS.secondary,
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },
  imagePickerText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  previewImage: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
    marginVertical: 10,
    borderRadius: 10,
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
    bottom: 600,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});