import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  MapPin, Cloud, Sun, Umbrella, Coffee, Utensils, Moon, 
  Car, Info, Navigation, CloudRain, Thermometer, Clock, PenLine
} from 'lucide-react';

// --- 타입 정의 ---

type Slot = 'morning' | 'afternoon' | 'evening' | 'night';
type ItemType = 'place' | 'food' | 'activity' | 'transport' | 'rest';

interface GrabEstimate {
  min: number;
  max: number;
}

interface FareEstimate {
  grab4: GrabEstimate;
  grab7: GrabEstimate;
}

interface RouteInfo {
  distanceMeters: number;
  durationSec: number;
  fareEstimateVND: FareEstimate;
}

interface ItineraryItem {
  id: string;
  day: number;
  date: string;
  slot: Slot;
  name: string;
  type: ItemType;
  lat: number;
  lng: number;
  mapQuery: string;
  dirMapUrl: string;
  placeUrl?: string;
  durationMin: number;
  costVND: { min: number; max: number };
  why: string;
  tips: string[];
  rainAlternative: string;
  businessHours?: string; // 영업시간 추가
  breakTime?: string;     // 브레이크 타임 추가
  closedDays?: string;    // 휴무일 추가
  routeFromPrev?: RouteInfo;
}

interface DayHeader {
  day: number;
  date: string;
  representativeLat: number;
  representativeLng: number;
}

interface TripData {
  tripId: string;
  days: number;
  nights: number;
  dayHeaders: DayHeader[];
  itinerary: ItineraryItem[];
}

// --- 모의 데이터 (백엔드 시뮬레이션) ---

const MOCK_TRIP_DATA: TripData = {
  tripId: "DN-3N4D-20260403",
  days: 4,
  nights: 3,
  dayHeaders: [
    { day: 1, date: "2026-04-03", representativeLat: 16.0544, representativeLng: 108.2022 },
    { day: 2, date: "2026-04-04", representativeLat: 15.9964, representativeLng: 107.9965 },
    { day: 3, date: "2026-04-05", representativeLat: 15.8801, representativeLng: 108.3380 },
    { day: 4, date: "2026-04-06", representativeLat: 16.0667, representativeLng: 108.2241 },
  ],
  itinerary: [
    {
      id: "DN-D1-001", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "다낭 국제공항 도착",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "14:00 도착 예정. 수하물 수령 후 기사님 미팅.",
      tips: ["그랩(Grab) 앱이 아주 잘 잡혀요", "소량의 현금 환전 권장"],
      rainAlternative: "터미널 내 대기",
      businessHours: "24시간 운영",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D1-002", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "호텔 체크인 (미케비치 인근)",
      type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 90, costVND: { min: 0, max: 0 },
      why: "짐 풀기 및 휴식. 부모님 컨디션 조절.",
      tips: ["오션뷰 객실 요청 확인", "에어컨 온도 조절 필수"],
      rainAlternative: "호텔 로비 라운지 또는 스파",
      businessHours: "체크인 14:00 / 체크아웃 12:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 6500, durationSec: 900,
        fareEstimateVND: { grab4: { min: 110000, max: 140000 }, grab7: { min: 130000, max: 160000 } }
      }
    },
    {
      id: "DN-D1-003", day: 1, date: "2026-04-03", slot: "evening",
      name: "해산물 저녁 식사 (베만)",
      type: "food", lat: 16.0691, lng: 108.2468, mapQuery: "베만 해산물 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0691,108.2468&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Quan+Be+Man+Da+Nang",
      durationMin: 90, costVND: { min: 1500000, max: 2500000 },
      why: "바닷가 근처에서 즐기는 신선한 해산물.",
      tips: ["kg당 가격 미리 확인 필수", "가리비 치즈구이와 파기름 구이 추천"],
      rainAlternative: "실내 해산물 레스토랑 (브릴리언트 씨푸드 등)",
      businessHours: "09:00 - 23:30",
      breakTime: "없음",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1200, durationSec: 300,
        fareEstimateVND: { grab4: { min: 35000, max: 45000 }, grab7: { min: 45000, max: 55000 } }
      }
    },
    {
      id: "DN-D1-004", day: 1, date: "2026-04-03", slot: "night",
      name: "용다리 & 손트라 야시장 구경",
      type: "activity", lat: 16.0614, lng: 108.2359, mapQuery: "손트라 야시장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0614,108.2359&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Son+Tra+Night+Market+Da+Nang",
      durationMin: 60, costVND: { min: 200000, max: 500000 },
      why: "야경 감상 및 과일/기념품 가벼운 쇼핑.",
      tips: ["토/일 저녁 9시 용다리 불쇼 확인", "소지품 주의"],
      rainAlternative: "빈컴 플라자 몰 (쇼핑 및 카페)",
      businessHours: "18:00 - 24:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 2500, durationSec: 400,
        fareEstimateVND: { grab4: { min: 40000, max: 55000 }, grab7: { min: 50000, max: 65000 } }
      }
    },
    {
      id: "DN-D2-001", day: 2, date: "2026-04-04", slot: "morning",
      name: "바나힐 투어 & 점심 뷔페",
      type: "activity", lat: 15.9964, lng: 107.9965, mapQuery: "바나힐 썬월드",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.9964,107.9965&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Sun+World+Ba+Na+Hills",
      durationMin: 360, costVND: { min: 5400000, max: 6000000 },
      why: "다낭의 상징적인 테마파크. 케이블카와 골든브릿지, 그리고 점심 뷔페.",
      tips: ["티켓 미리 온라인 예매 필수", "산 위는 쌀쌀할 수 있으니 겉옷 준비", "점심 뷔페 포함 티켓 추천"],
      rainAlternative: "실내 테마파크(판타지 파크)",
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D2-002", day: 2, date: "2026-04-04", slot: "afternoon",
      name: "호텔 휴식 및 수영",
      type: "rest", lat: 16.0601, lng: 108.2458, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0601,108.2458&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Da+Nang",
      durationMin: 120, costVND: { min: 0, max: 0 },
      why: "바나힐 투어 후 피로 회복. 호텔 수영장 이용.",
      tips: ["수영복 미리 챙기기", "낮잠으로 체력 보충"],
      rainAlternative: "호텔 스파 이용",
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 25000, durationSec: 2700,
        fareEstimateVND: { grab4: { min: 350000, max: 400000 }, grab7: { min: 400000, max: 500000 } }
      }
    },
    {
      id: "DN-D2-003", day: 2, date: "2026-04-04", slot: "evening",
      name: "아지트 멀티플렉스 (마사지)",
      type: "rest", lat: 16.0721, lng: 108.2265, mapQuery: "아지트 멀티플렉스",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0721,108.2265&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Azit+Multiplex+Da+Nang",
      durationMin: 90, costVND: { min: 500000, max: 800000 },
      why: "한국인에게 인기 많은 깔끔한 마사지샵.",
      tips: ["카카오톡 예약 필수", "네일아트도 가능"],
      rainAlternative: "동일",
      businessHours: "09:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 600,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    },
    {
      id: "DN-D2-004", day: 2, date: "2026-04-04", slot: "night",
      name: "마담란 레스토랑 저녁",
      type: "food", lat: 16.0768, lng: 108.2230, mapQuery: "마담란 레스토랑",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0768,108.2230&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Madame+Lan+Restaurant+Da+Nang",
      durationMin: 90, costVND: { min: 1200000, max: 1800000 },
      why: "분위기 좋은 정통 베트남 요리.",
      tips: ["반세오 추천", "미리 테이블 예약 권장"],
      rainAlternative: "동일 (실내석 이용)",
      businessHours: "06:30 - 21:30",
      breakTime: "없음",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 300,
        fareEstimateVND: { grab4: { min: 30000, max: 40000 }, grab7: { min: 40000, max: 50000 } }
      }
    },
    {
      id: "DN-D2-005", day: 2, date: "2026-04-04", slot: "night",
      name: "한강 유람선 야경",
      type: "activity", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 한강 유람선",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0667,108.2241&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Han+River+Cruise+Da+Nang",
      durationMin: 60, costVND: { min: 300000, max: 400000 },
      why: "다낭의 야경을 배 위에서 감상.",
      tips: ["주말에는 용다리 불쇼 시간에 맞춰 탑승 추천"],
      rainAlternative: "취소 후 카페 이용",
      businessHours: "18:00 - 22:00",
      closedDays: "악천후 시 운행 중단",
      routeFromPrev: {
        distanceMeters: 1500, durationSec: 300,
        fareEstimateVND: { grab4: { min: 35000, max: 45000 }, grab7: { min: 45000, max: 60000 } }
      }
    },
    {
      id: "DN-D3-001", day: 3, date: "2026-04-05", slot: "morning",
      name: "오행산 (마블 마운틴)",
      type: "activity", lat: 16.0029, lng: 108.2638, mapQuery: "오행산 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0029,108.2638&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=The+Marble+Mountains+Da+Nang",
      durationMin: 90, costVND: { min: 240000, max: 300000 },
      why: "천연 동굴과 사찰 감상. 반드시 엘리베이터 이용.",
      tips: ["상행/하행 모두 엘리베이터 이용 필수"],
      rainAlternative: "참 조각 박물관",
      businessHours: "07:00 - 17:30",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D3-002", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "안방 비치 & 점심 (덱하우스)",
      type: "food", lat: 15.9146, lng: 108.3238, mapQuery: "안방 비치 덱하우스",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.9146,108.3238&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=The+Deckhouse+An+Bang+Beach",
      durationMin: 120, costVND: { min: 800000, max: 1200000 },
      why: "호이안의 아름다운 해변과 오션뷰 식사.",
      tips: ["해질녘 뷰도 좋음", "해산물 플래터 추천"],
      rainAlternative: "호이안 올드타운 내 실내 식당 (모닝글로리 등)",
      businessHours: "07:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 15000, durationSec: 1500,
        fareEstimateVND: { grab4: { min: 200000, max: 250000 }, grab7: { min: 250000, max: 300000 } }
      }
    },
    {
      id: "DN-D3-003", day: 3, date: "2026-04-05", slot: "evening",
      name: "호이안 올드타운 & 카페",
      type: "activity", lat: 15.8801, lng: 108.3380, mapQuery: "호이안 올드타운",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.8801,108.3380&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Hoi+An+Ancient+Town",
      durationMin: 180, costVND: { min: 120000, max: 200000 },
      why: "유네스코 세계문화유산. 등불이 아름다운 거리.",
      tips: ["통합 입장권 구매 필요", "루프탑 카페에서 전경 감상"],
      rainAlternative: "우비 입고 운치 즐기기",
      businessHours: "07:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 5000, durationSec: 600,
        fareEstimateVND: { grab4: { min: 70000, max: 90000 }, grab7: { min: 90000, max: 110000 } }
      }
    },
    {
      id: "DN-D3-004", day: 3, date: "2026-04-05", slot: "night",
      name: "호이안 야시장 & 소원배",
      type: "activity", lat: 15.8770, lng: 108.3270, mapQuery: "호이안 야시장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=15.8770,108.3270&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Hoi+An+Night+Market",
      durationMin: 90, costVND: { min: 200000, max: 400000 },
      why: "투본강에서 소원배 타고 소원 빌기.",
      tips: ["소원배 가격 정찰제 확인", "야시장에서 길거리 음식 체험"],
      rainAlternative: "야시장 구경만 (배 운행 중단 가능성)",
      businessHours: "17:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 300,
        fareEstimateVND: { grab4: { min: 20000, max: 30000 }, grab7: { min: 30000, max: 40000 } }
      }
    },
    {
      id: "DN-D4-001", day: 4, date: "2026-04-06", slot: "morning",
      name: "다낭 대성당 (핑크성당) & 콩카페",
      type: "activity", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 대성당",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0667,108.2241&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Cathedral",
      durationMin: 90, costVND: { min: 100000, max: 200000 },
      why: "다낭 시내 필수 포토존 및 코코넛 커피.",
      tips: ["미사 시간에는 내부 입장 제한", "콩카페 코코넛 스무디 커피 추천"],
      rainAlternative: "콩카페 실내",
      businessHours: "06:00 - 16:30 (성당)",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D4-002", day: 4, date: "2026-04-06", slot: "afternoon",
      name: "한시장 (기념품 쇼핑)",
      type: "activity", lat: 16.0688, lng: 108.2238, mapQuery: "한시장 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0688,108.2238&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Han+Market+Da+Nang",
      durationMin: 60, costVND: { min: 500000, max: 2000000 },
      why: "마지막 선물 쇼핑. 건망고, 커피 등.",
      tips: ["흥정 필수", "1층은 냄새가 강할 수 있음"],
      rainAlternative: "롯데마트 다낭점",
      businessHours: "06:00 - 19:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 500, durationSec: 300,
        fareEstimateVND: { grab4: { min: 20000, max: 30000 }, grab7: { min: 30000, max: 40000 } }
      }
    },
    {
      id: "DN-D4-003", day: 4, date: "2026-04-06", slot: "afternoon",
      name: "롯데마트 쇼핑 & 짐 정리",
      type: "activity", lat: 16.0345, lng: 108.2205, mapQuery: "롯데마트 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0345,108.2205&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Lotte+Mart+Da+Nang",
      durationMin: 90, costVND: { min: 1000000, max: 3000000 },
      why: "귀국 전 마지막 쇼핑. 정찰제라 편함.",
      tips: ["배달 서비스 이용 가능", "환전소 환율 좋음"],
      rainAlternative: "동일",
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 4000, durationSec: 600,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 75000, max: 95000 } }
      }
    },
    {
      id: "DN-D4-004", day: 4, date: "2026-04-06", slot: "evening",
      name: "공항 이동 및 출국",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport",
      durationMin: 120, costVND: { min: 0, max: 0 },
      why: "여행 마무리. 공항 도착 후 수속.",
      tips: ["출발 2시간 전 도착 권장", "남은 동 털기"],
      rainAlternative: "동일",
      businessHours: "24시간",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 500,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    }
  ]
};

// --- 모의 API 클라이언트 ---

const fetchItinerary = (day: number): Promise<ItineraryItem[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_TRIP_DATA.itinerary.filter(i => i.day === day));
    }, 400); 
  });
};

const fetchWeather = (lat: number, lng: number, date: string): Promise<{ temp: number | null, condition: string }> => {
  return new Promise((resolve) => {
    const targetDate = new Date(date);
    const now = new Date();
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    setTimeout(() => {
      if (diffDays > 10) {
        resolve({ temp: null, condition: "unavailable" });
      } else {
        resolve({ temp: 28, condition: "cloudy" });
      }
    }, 300);
  });
};

// --- 도우미 함수 ---

const EXCHANGE_RATE = 0.055; // 1 VND = 0.055 KRW (approx)

const formatVND = (amount: number) => {
  return `${(amount/1000).toLocaleString()}k`;
};

const formatKRW = (amount: number) => {
  return `${Math.round(amount * EXCHANGE_RATE).toLocaleString()}원`;
};

const formatVNDRange = (min: number, max: number) => {
  if (min === 0 && max === 0) return "포함 / 무료";
  return (
    <span>
      {formatVND(min)} - {formatVND(max)}
      <span className="text-gray-400 text-[10px] ml-1">
        ({formatKRW(min)}~{formatKRW(max)})
      </span>
    </span>
  );
};

const getSlotLabel = (slot: Slot) => {
  switch (slot) {
    case 'morning': return '오전';
    case 'afternoon': return '오후';
    case 'evening': return '저녁';
    case 'night': return '밤';
    default: return '';
  }
};

// --- 컴포넌트 ---

const WeatherBar = ({ day, date, lat, lng }: { day: number, date: string, lat: number, lng: number }) => {
  const [weather, setWeather] = useState<{ temp: number | null, condition: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWeather(null);
    setLoading(true);
    fetchWeather(lat, lng, date).then(data => {
      setWeather(data);
      setLoading(false);
    });
  }, [lat, lng, date]);

  return (
    <div className="bg-blue-600 text-white p-4 shadow-md transition-all">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <div>
          <h2 className="text-lg font-bold">다낭 여행 - {day}일차</h2>
          <p className="text-sm opacity-90">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-xs animate-pulse">로딩 중...</span>
          ) : weather?.condition === "unavailable" ? (
             <div className="flex flex-col items-end">
               <span className="text-xs bg-blue-700 px-2 py-1 rounded">날씨 정보 없음</span>
               <span className="text-[10px] opacity-75">(너무 먼 날짜)</span>
             </div>
          ) : (
            <>
              <Cloud className="w-6 h-6" />
              <span className="text-xl font-bold">{weather?.temp}°C</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DayTabs = ({ days, selectedDay, onSelect }: { days: DayHeader[], selectedDay: number, onSelect: (d: number) => void }) => {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 overflow-x-auto hide-scrollbar">
      <div className="flex max-w-md mx-auto">
        {days.map((d) => (
          <button
            key={d.day}
            onClick={() => onSelect(d.day)}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
              selectedDay === d.day
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {d.day}일차
            <span className="block text-[10px] font-normal">{d.date.slice(5)}</span>
          </button>
        ))}
        <button
          onClick={() => onSelect(999)}
          className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
            selectedDay === 999
              ? "border-yellow-500 text-yellow-600 bg-yellow-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          메모
          <span className="block text-[10px] font-normal">예약/기록</span>
        </button>
      </div>
    </div>
  );
};

const ItineraryCard: React.FC<{ item: ItineraryItem }> = ({ item }) => {
  const getIcon = (type: ItemType) => {
    switch (type) {
      case 'place': return <MapPin className="w-5 h-5 text-purple-500" />;
      case 'food': return <Utensils className="w-5 h-5 text-orange-500" />;
      case 'activity': return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'transport': return <Car className="w-5 h-5 text-blue-500" />;
      case 'rest': return <Coffee className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleRowClick = () => {
    if (item.dirMapUrl) {
      window.open(item.dirMapUrl, '_blank');
    }
  };

  return (
    <div className="mb-6 relative">
      {/* 이전 장소에서의 이동 선 */}
      {item.routeFromPrev && (
        <div className="absolute -top-6 left-6 w-0.5 h-6 bg-gray-300"></div>
      )}

      {/* 이동 정보 */}
      {item.routeFromPrev && (
        <div className="mx-4 mb-2 bg-gray-50 rounded p-2 text-xs text-gray-500 border border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-1">
             <Car className="w-3 h-3" />
             <span>{(item.routeFromPrev.distanceMeters / 1000).toFixed(1)}km (약 {Math.round(item.routeFromPrev.durationSec/60)}분)</span>
          </div>
          <div className="text-right">
            <div>그랩4인: <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab4.min, item.routeFromPrev.fareEstimateVND.grab4.max)}</span></div>
            <div>그랩7인: <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab7.min, item.routeFromPrev.fareEstimateVND.grab7.max)}</span></div>
          </div>
        </div>
      )}

      <div 
        onClick={handleRowClick}
        className="mx-4 bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-blue-50 transition-colors cursor-pointer ring-1 ring-transparent hover:ring-blue-200"
      >
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="p-2 bg-gray-100 rounded-full">
              {getIcon(item.type)}
            </div>
            <div className="h-full w-0.5 bg-gray-100 my-2"></div>
          </div>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{getSlotLabel(item.slot)}</span>
              <Navigation className="w-4 h-4 text-blue-400" />
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">{item.name}</h3>
            <p className="text-sm text-gray-600 mb-3 italic">"{item.why}"</p>
            
            {/* 가게 정보 (영업시간/브레이크타임/휴무일/상세보기) 추가 */}
            {(item.businessHours || item.breakTime || item.closedDays || item.placeUrl) && (
              <div className="mb-3 bg-blue-50/50 rounded-lg p-3 border border-blue-100/50 flex flex-col gap-2">
                {(item.businessHours || item.breakTime || item.closedDays) && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500 mt-0.5" />
                    <div className="text-[11px] text-blue-800 leading-relaxed">
                      {item.businessHours && <div><strong>영업:</strong> {item.businessHours}</div>}
                      {item.breakTime && <div><strong>브레이크 타임:</strong> {item.breakTime}</div>}
                      {item.closedDays && <div><strong>휴무:</strong> {item.closedDays}</div>}
                    </div>
                  </div>
                )}
                {item.placeUrl && (
                  <a 
                    href={item.placeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-white border border-blue-200 px-2.5 py-1.5 rounded-md hover:bg-blue-50 self-start transition-colors shadow-sm"
                  >
                    <MapPin className="w-3 h-3" />
                    구글맵 상세보기
                  </a>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              {item.tips.map((tip, idx) => (
                <span key={idx} className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded-md border border-yellow-100">
                  💡 {tip}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-gray-50">
              <div>
                <span className="text-gray-400 block mb-0.5">예상 경비 (합계)</span>
                <span className="font-medium text-gray-700">
                  {formatVNDRange(item.costVND.min, item.costVND.max)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block mb-0.5 flex items-center justify-end gap-1">
                  <Umbrella className="w-3 h-3" /> 우천 시 대안
                </span>
                <span className="font-medium text-blue-600 line-clamp-1">
                  {item.rainAlternative}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CurrencyConverter = () => {
  const [vnd, setVnd] = useState<string>("");
  const [krw, setKrw] = useState<string>("0");

  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, "");
    if (!isNaN(Number(value))) {
      setVnd(Number(value).toLocaleString());
      setKrw(Math.round(Number(value) * EXCHANGE_RATE).toLocaleString());
    }
  };

  return (
    <div className="mx-4 mb-6 bg-white rounded-xl shadow-sm border border-blue-100 p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className="bg-green-100 text-green-700 p-1 rounded">₫</span>
        간편 환율 계산기
      </h3>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <input
            type="text"
            value={vnd}
            onChange={handleVndChange}
            placeholder="0"
            className="w-full pl-3 py-2 text-right focus:outline-none text-sm min-w-0"
          />
          <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
            VND
          </div>
        </div>
        <span className="text-gray-400">=</span>
        <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <div className="w-full pl-3 py-2 text-right text-gray-700 text-sm min-w-0 truncate">
            {krw}
          </div>
          <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
            KRW
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-right">* 10,000동 ≈ 550원 기준</p>
    </div>
  );
};

const MemoPad = () => {
  const [memo, setMemo] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("trip_memo");
    if (saved) setMemo(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
    localStorage.setItem("trip_memo", e.target.value);
  };

  return (
    <div className="mx-4 animate-fade-in">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm relative">
        <div className="absolute top-0 left-0 w-full h-8 bg-yellow-100 rounded-t-xl border-b border-yellow-200 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="mt-6">
            <textarea
            value={memo}
            onChange={handleChange}
            placeholder="여기에 예약 번호, 맛집 리스트, 쇼핑 목록 등을 자유롭게 적어두세요."
            className="w-full h-[50vh] bg-transparent border-none resize-none focus:ring-0 text-gray-700 placeholder-gray-400 text-base font-medium"
            style={{ 
                backgroundImage: 'linear-gradient(transparent, transparent 27px, #e5e7eb 28px)', 
                backgroundSize: '100% 28px',
                lineHeight: '28px',
                paddingTop: '0px'
            }}
            />
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
        <PenLine className="w-3 h-3" /> 작성한 내용은 브라우저에 자동으로 저장됩니다.
      </p>
    </div>
  );
};

const App = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDay === 999) return; // 메모 탭일 때는 API 호출 스킵
    setLoading(true);
    fetchItinerary(selectedDay).then(data => {
      setItinerary(data);
      setLoading(false);
    });
  }, [selectedDay]);

  const currentDayHeader = useMemo(() => 
    MOCK_TRIP_DATA.dayHeaders.find(d => d.day === selectedDay), 
  [selectedDay]);

  if (selectedDay !== 999 && !currentDayHeader) return <div className="p-10 text-center">여정 데이터를 불러오는 데 실패했습니다.</div>;

  return (
    <div className="min-h-screen pb-10 max-w-md mx-auto bg-gray-50 shadow-2xl overflow-hidden">
      {selectedDay === 999 ? (
        <div className="bg-yellow-500 text-white p-4 shadow-md transition-all">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div>
              <h2 className="text-lg font-bold">여행 메모장</h2>
              <p className="text-sm opacity-90">예약 정보와 꿀팁 기록</p>
            </div>
            <PenLine className="w-6 h-6" />
          </div>
        </div>
      ) : (
        currentDayHeader && <WeatherBar 
          day={selectedDay} 
          date={currentDayHeader.date} 
          lat={currentDayHeader.representativeLat} 
          lng={currentDayHeader.representativeLng} 
        />
      )}
      
      <DayTabs 
        days={MOCK_TRIP_DATA.dayHeaders} 
        selectedDay={selectedDay} 
        onSelect={setSelectedDay} 
      />

      <div className="mt-6">
        {selectedDay === 999 ? (
          <MemoPad />
        ) : (
          <>
            <CurrencyConverter />
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">일정을 구성하고 있습니다...</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                {itinerary.length > 0 ? itinerary.map((item) => (
                  <ItineraryCard key={item.id} item={item} />
                )) : (
                  <div className="text-center py-20 text-gray-400 text-sm italic">해당 일자의 세부 일정이 아직 업데이트되지 않았습니다.</div>
                )}
                
                <div className="text-center py-8 text-gray-400 text-xs">
                  <p>{selectedDay}일차 일정 종료</p>
                  <p className="mt-1">카드를 누르면 구글 지도로 길찾기가 실행됩니다</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);