import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  MapPin, Cloud, Sun, Umbrella, Coffee, Utensils, Moon, 
  Car, Info, Navigation, CloudRain, Thermometer, Clock, PenLine, Footprints, Bus,
  ChevronRight, ChevronLeft, CheckSquare, Trash2
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
  durationWalkingSec?: number;
  durationPublicTransportSec?: number;
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
  rainAlternative: AlternativeItem | null;
  reservationUrl?: string; // 예약 홈페이지 추가
  businessHours?: string; // 영업시간 추가
  breakTime?: string;     // 브레이크 타임 추가
  closedDays?: string;    // 휴무일 추가
  routeFromPrev?: RouteInfo;
}

interface AlternativeItem {
  name: string;
  type: ItemType;
  lat: number;
  lng: number;
  mapQuery: string;
  placeUrl?: string;
  why: string;
  tips: string[];
  businessHours?: string;
  breakTime?: string;
  closedDays?: string;
  reservationUrl?: string;
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
    { day: 1, date: "2026-04-03", representativeLat: 16.0544, representativeLng: 108.2022 }, // 다낭 공항/시내
    { day: 2, date: "2026-04-04", representativeLat: 16.0599, representativeLng: 108.2434 }, // 미케비치 주변
    { day: 3, date: "2026-04-05", representativeLat: 16.0688, representativeLng: 108.2238 }, // 한시장/시내 주변
    { day: 4, date: "2026-04-06", representativeLat: 16.0667, representativeLng: 108.2241 }, // 다낭 대성당 주변
  ],
  itinerary: [
    {
      id: "DN-D1-001", day: 1, date: "2026-04-03", slot: "morning",
      name: "다낭 국제공항 도착 (10:45)",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항 터미널2",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport+Terminal+2",
      durationMin: 45, costVND: { min: 0, max: 0 },
      why: "10:45 다낭 도착. 입국 수속, 수하물 찾기, 화장실 이용 및 물 구입.",
      tips: ["입국 수속 후 미용실 픽업 차량 탑승 준비"],
      rainAlternative: null,
      businessHours: "24시간 운영",
      closedDays: "연중무휴",
      routeFromPrev: undefined
    },
    {
      id: "DN-D1-001-2", day: 1, date: "2026-04-03", slot: "morning",
      name: "미용실 픽업 차량 탑승 (11:30)",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항 터미널2",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport+Terminal+2",
      durationMin: 30, costVND: { min: 0, max: 0 },
      why: "공항에서 바로 미용실 픽업 차량을 타고 이동합니다.",
      tips: ["기사님과 미팅 포인트 사전 확인"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 0, durationSec: 0, durationWalkingSec: 0, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D1-002", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "점심 식사 (미꽝꼬사우) (12:00 - 13:00)",
      type: "food", lat: 16.0650, lng: 108.2350, mapQuery: "397 Đ. Trần Hưng Đạo, Đà Nẵng",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0650,108.2350&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Mi+Quang+Co+Sau+Da+Nang",
      durationMin: 60, costVND: { min: 100000, max: 200000 },
      why: "다낭 도착 후 첫 식사. 베트남 중부 대표 면 요리인 미꽝을 맛봅니다.",
      tips: ["주소: 397 Đ. Trần Hưng Đạo, An Hải Trung, Sơn Trà"],
      rainAlternative: null,
      businessHours: "06:00 - 21:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 5000, durationSec: 900, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D1-003", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "BOSS 보스 이발소 (13:10 - 14:10)",
      type: "activity", lat: 16.0640, lng: 108.2340, mapQuery: "353 Đ. Trần Hưng Đạo, Đà Nẵng",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0640,108.2340&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Boss+Barbershop+Da+Nang",
      durationMin: 60, costVND: { min: 300000, max: 500000 },
      why: "베트남식 이발소 체험. 샴푸, 마사지, 귀청소 등 풀케어 서비스로 비행 피로를 풉니다.",
      tips: ["주소: 353 Đ. Trần Hưng Đạo, An Hải Trung, Sơn Trà", "점심 식사 후 도보 이동 가능"],
      rainAlternative: null,
      businessHours: "09:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 200, durationSec: 180, durationWalkingSec: 180, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D1-004", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "노보텔 다낭 체크인 & 휴식 (14:30 - 15:30)",
      type: "rest", lat: 16.0755, lng: 108.2235, mapQuery: "Novotel Danang Premier Han River",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0755,108.2235&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Novotel+Danang+Premier+Han+River",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "호텔 체크인 후 짐을 정리하고 잠깐 휴식을 취합니다.",
      tips: ["이발소에서 제공하는 드랍 서비스 이용 가능 여부 확인"],
      rainAlternative: null,
      businessHours: "체크인 14:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 600, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    },
    {
      id: "DN-D1-005", day: 1, date: "2026-04-03", slot: "afternoon",
      name: "링엄사 (영흥사) (16:00 - 17:30)",
      type: "activity", lat: 16.1009, lng: 108.2778, mapQuery: "Linh Ung Pagoda",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.1009,108.2778&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Linh+Ung+Pagoda+Da+Nang",
      durationMin: 90, costVND: { min: 0, max: 0 },
      why: "거대한 해수관음상과 다낭 바다/도시 전망을 감상할 수 있는 곳. 부모님도 걷기 편한 가벼운 산책 코스입니다.",
      tips: ["원숭이 주의 (소지품 조심)", "그랩 기사님과 왕복(대기) 흥정 추천"],
      rainAlternative: {
        name: "다낭 시내 마사지",
        type: "rest", lat: 16.0600, lng: 108.2300, mapQuery: "다낭 마사지",
        why: "비가 많이 올 경우 야외 산책 대신 실내 마사지로 대체.",
        tips: ["호텔 근처 마사지샵 이용"],
      },
      businessHours: "06:00 - 21:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 10000, durationSec: 1200, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 120000, max: 150000 }, grab7: { min: 150000, max: 180000 } }
      }
    },
    {
      id: "DN-D1-006", day: 1, date: "2026-04-03", slot: "evening",
      name: "선짜 야시장 & 저녁 식사 (18:00 - 19:10)",
      type: "activity", lat: 16.0618, lng: 108.2375, mapQuery: "선짜 야시장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0618,108.2375&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Son+Tra+Night+Market",
      durationMin: 70, costVND: { min: 200000, max: 400000 },
      why: "링엄사에서 내려오는 길에 들르기 좋으며, 이후 한강 유람선 탑승장과 가깝습니다. 간식 및 기념품 구경으로 저녁을 대체합니다.",
      tips: ["해산물 구이, 반짱느엉 등 길거리 음식 체험", "가격 흥정 필수"],
      rainAlternative: {
        name: "용다리 근처 실내 식당",
        type: "food", lat: 16.0614, lng: 108.2359, mapQuery: "다낭 용다리 맛집",
        why: "비가 오면 야시장 대신 근처 실내 식당에서 저녁 식사.",
        tips: ["유람선 선착장과 가까운 곳 선택"],
      },
      businessHours: "18:00 - 24:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 9000, durationSec: 1200, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 100000, max: 130000 }, grab7: { min: 130000, max: 160000 } }
      }
    },
    {
      id: "DN-D1-007", day: 1, date: "2026-04-03", slot: "evening",
      name: "한강 유람선 야경 감상 (19:30 - 20:30)",
      type: "activity", lat: 16.0650, lng: 108.2250, mapQuery: "다낭 한강 유람선 선착장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0650,108.2250&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Han+River+Cruise",
      durationMin: 60, costVND: { min: 150000, max: 250000 },
      why: "배 위에서 용다리와 한강의 아름다운 야경을 편안하게 감상합니다. 금요일이라 용다리 불쇼는 없지만, 야경 자체로 만족도가 높습니다.",
      tips: ["선짜 야시장에서 도보 또는 그랩으로 이동", "미리 티켓 예매 권장"],
      rainAlternative: null,
      businessHours: "18:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1500, durationSec: 300, durationWalkingSec: 1200, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 30000, max: 40000 }, grab7: { min: 40000, max: 50000 } }
      }
    },
    {
      id: "DN-D1-008", day: 1, date: "2026-04-03", slot: "night",
      name: "숙소 복귀 및 휴식 (21:00)",
      type: "rest", lat: 16.0755, lng: 108.2235, mapQuery: "Novotel Danang Premier Han River",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0755,108.2235&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Novotel+Danang+Premier+Han+River",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "1일차 일정을 마무리하고 호텔로 복귀하여 휴식합니다.",
      tips: ["내일 오행산 일정을 위해 충분한 휴식"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 2000, durationSec: 400, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 35000, max: 45000 }, grab7: { min: 45000, max: 60000 } }
      }
    },
    {
      id: "DN-D2-001", day: 2, date: "2026-04-04", slot: "morning",
      name: "오행산 (엘리베이터 코스) (09:30 - 11:30)",
      type: "activity", lat: 16.0062, lng: 108.2636, mapQuery: "오행산",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0062,108.2636&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Marble+Mountains+Da+Nang",
      durationMin: 120, costVND: { min: 40000, max: 100000 },
      why: "엘리베이터를 타고 올라가 동굴 1개와 전망대 1곳만 가볍게 둘러봅니다. (부모님 체력 고려)",
      tips: ["엘리베이터 편도/왕복 티켓 구매", "미끄러지지 않는 신발 착용", "무리한 등반 자제"],
      rainAlternative: {
        name: "참 조각 박물관 (실내)",
        type: "activity", lat: 16.0611, lng: 108.2234, mapQuery: "참 조각 박물관",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Museum+of+Cham+Sculpture",
        why: "비가 올 경우 실내 박물관 관람 (60~90분 소요).",
        tips: ["한국어 오디오 가이드 확인"],
        businessHours: "07:30 - 17:00",
      },
      businessHours: "07:00 - 17:30",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 10000, durationSec: 1200, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 150000, max: 200000 }, grab7: { min: 200000, max: 250000 } }
      }
    },
    {
      id: "DN-D2-002-1", day: 2, date: "2026-04-04", slot: "afternoon",
      name: "점심 식사 (12:30 - 14:30)",
      type: "food", lat: 16.0599, lng: 108.2434, mapQuery: "미케비치 맛집",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0599,108.2434&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Restaurant",
      durationMin: 120, costVND: { min: 300000, max: 800000 },
      why: "오행산 일정 후 시내 또는 미케비치 근처에서 시원하게 점심 식사.",
      tips: ["부모님을 위해 에어컨이 시원한 식당 선정"],
      rainAlternative: null,
      businessHours: "10:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 8000, durationSec: 900, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 100000, max: 130000 }, grab7: { min: 120000, max: 150000 } }
      }
    },
    {
      id: "DN-D2-002-2", day: 2, date: "2026-04-04", slot: "afternoon",
      name: "미케비치 카페 휴식 & 짧은 산책 (14:30 - 16:30)",
      type: "rest", lat: 16.0599, lng: 108.2434, mapQuery: "미케비치 카페",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0599,108.2434&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Cafe",
      durationMin: 120, costVND: { min: 100000, max: 300000 },
      why: "바다 뷰 카페에서 휴식을 취하고 미케비치 해변을 짧게 산책합니다.",
      tips: ["해변 산책은 짧게, 카페에서 충분한 휴식"],
      rainAlternative: null,
      businessHours: "08:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 200, durationSec: 180, durationWalkingSec: 180, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D2-003-1", day: 2, date: "2026-04-04", slot: "evening",
      name: "저녁 식사 (17:30 - 19:00)",
      type: "food", lat: 16.0600, lng: 108.2300, mapQuery: "다낭 맛집",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0600,108.2300&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Restaurant",
      durationMin: 90, costVND: { min: 500000, max: 1200000 },
      why: "다낭 시내 맛집에서 저녁 식사.",
      tips: ["유명 식당은 예약 권장"],
      rainAlternative: null,
      businessHours: "10:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 600, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 50000, max: 70000 }, grab7: { min: 60000, max: 80000 } }
      }
    },
    {
      id: "DN-D2-003-2", day: 2, date: "2026-04-04", slot: "evening",
      name: "마사지 (선택) (19:00 - 20:15)",
      type: "rest", lat: 16.0600, lng: 108.2300, mapQuery: "다낭 마사지",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0600,108.2300&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Spa",
      durationMin: 75, costVND: { min: 500000, max: 800000 },
      why: "저녁 식사 후 피로도에 따라 마사지(60~75분)를 받습니다.",
      tips: ["피곤하면 마사지 생략하고 바로 야시장 이동 가능"],
      rainAlternative: null,
      businessHours: "09:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 200, durationSec: 180, durationWalkingSec: 180, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D2-004", day: 2, date: "2026-04-04", slot: "night",
      name: "헬리오 야시장 (20:30 - 22:00)",
      type: "activity", lat: 16.0395, lng: 108.2267, mapQuery: "헬리오 야시장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0395,108.2267&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Helio+Night+Market",
      durationMin: 90, costVND: { min: 200000, max: 500000 },
      why: "깔끔하고 분위기 좋은 야시장. 먹거리와 구경 위주로 즐깁니다.",
      tips: ["부모님을 위해 앉아서 쉬는 포인트 자주 찾기", "라이브 공연 구경"],
      rainAlternative: {
        name: "롯데마트 다낭 (야간 쇼핑)",
        type: "activity", lat: 16.0345, lng: 108.2205, mapQuery: "롯데마트 다낭",
        why: "비가 오면 근처 롯데마트에서 쇼핑.",
        tips: ["기념품 미리 구매"],
      },
      businessHours: "17:30 - 22:30",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 4000, durationSec: 600, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 70000, max: 90000 } }
      }
    },
    {
      id: "DN-D2-005", day: 2, date: "2026-04-04", slot: "night",
      name: "숙소 복귀 (노보텔 다낭)",
      type: "rest", lat: 16.0755, lng: 108.2235, mapQuery: "Novotel Danang Premier Han River",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0755,108.2235&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Novotel+Danang+Premier+Han+River",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "일정 마무리 및 휴식.",
      tips: ["내일 일정을 위해 충분한 휴식"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 5000, durationSec: 800, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 70000, max: 90000 }, grab7: { min: 90000, max: 110000 } }
      }
    },
    {
      id: "DN-D3-000", day: 3, date: "2026-04-05", slot: "morning",
      name: "체크아웃 & 짐 보관 (10:00)",
      type: "transport", lat: 16.0755, lng: 108.2235, mapQuery: "Novotel Danang Premier Han River",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0755,108.2235&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Novotel+Danang+Premier+Han+River",
      durationMin: 20, costVND: { min: 0, max: 0 },
      why: "노보텔 체크아웃 후, 프론트에 짐을 보관하고 시내 일정을 시작합니다.",
      tips: ["체크아웃 시 미니바 사용 내역 확인"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 0, durationSec: 0, durationWalkingSec: 0, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-001", day: 3, date: "2026-04-05", slot: "morning",
      name: "핑크성당 (다낭 대성당) (10:20 - 10:50)",
      type: "activity", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 대성당",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0667,108.2241&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Cathedral",
      durationMin: 30, costVND: { min: 0, max: 0 },
      why: "프랑스 식민지 시대에 지어진 분홍색 성당으로 다낭의 대표적인 포토존입니다.",
      tips: ["미사 시간에는 내부 입장이 제한될 수 있습니다.", "성당 앞에서 인증샷 필수"],
      rainAlternative: null,
      businessHours: "06:00 - 16:30 (일요일 11:30 - 13:30)",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1500, durationSec: 300, durationWalkingSec: 1200, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 30000, max: 40000 }, grab7: { min: 40000, max: 50000 } }
      }
    },
    {
      id: "DN-D3-002", day: 3, date: "2026-04-05", slot: "morning",
      name: "한시장 쇼핑 (10:55 - 11:40)",
      type: "activity", lat: 16.0688, lng: 108.2238, mapQuery: "한시장",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0688,108.2238&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Han+Market+Da+Nang",
      durationMin: 45, costVND: { min: 500000, max: 2000000 },
      why: "다낭 최대 재래시장. 부모님 체력을 고려하여 45분~1시간 내외로 짧게 구경합니다.",
      tips: ["1층 냄새가 심할 수 있으니 마스크 준비", "흥정 필수", "망고젤리, 라탄백 추천"],
      rainAlternative: {
        name: "한시장 (실내)",
        type: "activity", lat: 16.0688, lng: 108.2238, mapQuery: "한시장",
        placeUrl: "https://www.google.com/maps/search/?api=1&query=Han+Market+Da+Nang",
        why: "실내 시장이라 비를 피하며 쇼핑 가능.",
        tips: ["미끄러움 주의"],
        businessHours: "06:00 - 19:00",
      },
      businessHours: "06:00 - 19:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 500, durationSec: 300, durationWalkingSec: 300, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-003", day: 3, date: "2026-04-05", slot: "morning",
      name: "콩카페 & 점심 식사 (11:45 - 12:40)",
      type: "food", lat: 16.0678, lng: 108.2245, mapQuery: "콩카페 1호점",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0678,108.2245&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Cong+Caphe+Da+Nang",
      durationMin: 55, costVND: { min: 200000, max: 500000 },
      why: "시간 절약을 위해 콩카페에서 코코넛 커피와 함께 근처 반미 가게 등에서 간단히 점심을 해결합니다.",
      tips: ["콩카페에서 음료 주문 후 근처 식당 이용", "부모님 휴식 시간"],
      rainAlternative: null,
      businessHours: "07:00 - 23:30",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 150, durationSec: 120, durationWalkingSec: 120, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-004", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "짐 찾기 및 새 숙소 이동 (12:40 - 14:00)",
      type: "transport", lat: 16.0522, lng: 108.2440, mapQuery: "D34 An Thượng 34, Mỹ An, Đà Nẵng",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0522,108.2440&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=D34+An+Thượng+34+Mỹ+An+Đà+Nẵng",
      durationMin: 80, costVND: { min: 60000, max: 100000 },
      why: "노보텔로 돌아가 짐을 찾은 후, 미케비치 근처의 새 숙소(Serenity Villa)로 이동합니다.",
      tips: ["그랩 호출 시 짐 싣기 편한 7인승 추천"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 6000, durationSec: 1200, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 80000, max: 100000 } }
      }
    },
    {
      id: "DN-D3-005", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "새 숙소 체크인 및 휴식 (14:00 - 15:30)",
      type: "rest", lat: 16.0522, lng: 108.2440, mapQuery: "D34 An Thượng 34, Mỹ An, Đà Nẵng",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0522,108.2440&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=D34+An+Thượng+34+Mỹ+An+Đà+Nẵng",
      durationMin: 90, costVND: { min: 0, max: 0 },
      why: "새 숙소에 체크인하고 짐을 푼 뒤, 샤워 및 휴식을 취합니다.",
      tips: ["오후 일정을 위해 충분한 휴식"],
      rainAlternative: null,
      businessHours: "체크인 14:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 0, durationSec: 0, durationWalkingSec: 0, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-006", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "미케비치 산책 (15:45 - 16:30)",
      type: "activity", lat: 16.0599, lng: 108.2434, mapQuery: "미케비치",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0599,108.2434&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach",
      durationMin: 45, costVND: { min: 0, max: 0 },
      why: "숙소 근처 미케비치를 가볍게 산책합니다. (날씨와 체력에 따라 유동적으로 진행)",
      tips: ["햇빛이 강할 수 있으니 모자/선글라스 준비"],
      rainAlternative: {
        name: "숙소 내 휴식",
        type: "rest", lat: 16.0522, lng: 108.2440, mapQuery: "D34 An Thượng 34, Mỹ An, Đà Nẵng",
        why: "비가 오거나 너무 더우면 숙소에서 계속 휴식.",
        tips: ["무리한 야외 활동 자제"],
      },
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 900, durationWalkingSec: 900, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-007", day: 3, date: "2026-04-05", slot: "afternoon",
      name: "미케비치 근처 카페 (16:30 - 17:30)",
      type: "rest", lat: 16.0599, lng: 108.2434, mapQuery: "미케비치 카페",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0599,108.2434&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Cafe",
      durationMin: 60, costVND: { min: 100000, max: 200000 },
      why: "산책 후 에어컨이 있는 시원한 카페에서 휴식을 취합니다.",
      tips: ["부모님이 편하게 앉을 수 있는 좌석이 있는 곳 선택"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 200, durationSec: 180, durationWalkingSec: 180, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-008", day: 3, date: "2026-04-05", slot: "evening",
      name: "저녁 식사 (18:00 - 19:30)",
      type: "food", lat: 16.0522, lng: 108.2440, mapQuery: "미케비치 맛집",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0522,108.2440&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=My+Khe+Beach+Restaurant",
      durationMin: 90, costVND: { min: 500000, max: 1200000 },
      why: "이동을 최소화하기 위해 숙소 근처 맛집에서 저녁 식사를 합니다.",
      tips: ["해산물 식당 등 부모님 취향에 맞는 곳 선택"],
      rainAlternative: null,
      businessHours: "10:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 900, durationWalkingSec: 900, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D3-009", day: 3, date: "2026-04-05", slot: "night",
      name: "숙소 복귀 및 짐 정리 (19:45)",
      type: "rest", lat: 16.0522, lng: 108.2440, mapQuery: "D34 An Thượng 34, Mỹ An, Đà Nẵng",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0522,108.2440&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=D34+An+Thượng+34+Mỹ+An+Đà+Nẵng",
      durationMin: 0, costVND: { min: 0, max: 0 },
      why: "저녁 식사 후 숙소로 복귀하여 휴식을 취하고 내일 출국을 위한 짐을 미리 정리합니다.",
      tips: ["내일 출국을 위한 짐 정리"],
      rainAlternative: null,
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 900, durationWalkingSec: 900, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D4-001", day: 4, date: "2026-04-06", slot: "morning",
      name: "체크아웃 & 롯데마트 쇼핑 (10:00 - 12:00)",
      type: "activity", lat: 16.0345, lng: 108.2205, mapQuery: "롯데마트 다낭",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0345,108.2205&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Lotte+Mart+Da+Nang",
      durationMin: 120, costVND: { min: 1000000, max: 3000000 },
      why: "체크아웃 후 귀국 선물 쇼핑. 롯데마트 3층/4층에 짐 보관 가능.",
      tips: ["커피, 건망고, 과자 등 구입", "쇼핑 후 롯데마트 내 식당에서 점심 해결 가능", "또는 마사지샵 픽업/짐보관 서비스를 이용해 짐을 먼저 맡기는 것도 좋습니다."],
      rainAlternative: null,
      businessHours: "08:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 4000, durationSec: 600, durationWalkingSec: 3000, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 75000, max: 95000 } }
      }
    },
    {
      id: "DN-D4-001-5-1", day: 4, date: "2026-04-06", slot: "afternoon",
      name: "다낭 시내 한강변 산책 (13:00 - 14:30)",
      type: "activity", lat: 16.0630, lng: 108.2235, mapQuery: "APEC Park Da Nang",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0630,108.2235&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=APEC+Park+Da+Nang",
      durationMin: 90, costVND: { min: 0, max: 0 },
      why: "공항과 가까운 시내(APEC 조각공원 등)에서 부모님과 무리하지 않고 한강 풍경을 보며 산책합니다.",
      tips: ["마사지샵에 미리 짐을 맡기고 가벼운 몸으로 시내를 둘러보세요"],
      rainAlternative: {
        name: "다낭 시내 대형 실내 카페",
        type: "rest", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 카페",
        why: "비가 올 경우 산책 대신 쾌적한 실내 대형 카페에서 휴식.",
        tips: ["베이커리가 맛있는 카페 추천"],
      },
      businessHours: "상시",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 4000, durationSec: 700, durationWalkingSec: undefined, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 60000, max: 80000 }, grab7: { min: 80000, max: 100000 } }
      }
    },
    {
      id: "DN-D4-001-5-2", day: 4, date: "2026-04-06", slot: "afternoon",
      name: "카페 휴식 (14:30 - 16:00)",
      type: "rest", lat: 16.0667, lng: 108.2241, mapQuery: "다낭 한강변 카페",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0667,108.2241&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Han+River+Cafe",
      durationMin: 90, costVND: { min: 100000, max: 200000 },
      why: "산책 후 근처 한강변 뷰가 좋은 카페(콩카페 등)에서 커피 한잔의 여유를 즐깁니다.",
      tips: ["에어컨이 잘 나오는 곳으로 선택"],
      rainAlternative: null,
      businessHours: "07:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 500, durationSec: 420, durationWalkingSec: 420, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D4-001-6-1", day: 4, date: "2026-04-06", slot: "evening",
      name: "저녁 식사 (16:30 - 18:00)",
      type: "food", lat: 16.0600, lng: 108.2300, mapQuery: "다낭 맛집",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0600,108.2300&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Restaurant",
      durationMin: 90, costVND: { min: 500000, max: 1200000 },
      why: "비행기 타기 전 든든하게 다낭에서의 마지막 저녁 식사.",
      tips: ["마사지샵 근처 맛집으로 동선 최소화"],
      rainAlternative: null,
      businessHours: "10:00 - 22:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 1000, durationSec: 300, durationWalkingSec: 900, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 30000, max: 40000 }, grab7: { min: 40000, max: 50000 } }
      }
    },
    {
      id: "DN-D4-001-6-2", day: 4, date: "2026-04-06", slot: "evening",
      name: "출국 전 마사지 (18:00 - 20:00)",
      type: "rest", lat: 16.0600, lng: 108.2300, mapQuery: "다낭 마사지",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0600,108.2300&travelmode=walking",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+Spa",
      durationMin: 120, costVND: { min: 500000, max: 800000 },
      why: "여행의 피로를 푸는 전신 마사지. 마사지 후 샤워를 하고 공항으로 이동합니다.",
      tips: ["샤워 가능한 마사지샵 이용 시 비행 전 상쾌함", "마사지샵 공항 샌딩 서비스 활용"],
      rainAlternative: null,
      businessHours: "09:00 - 23:00",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 200, durationSec: 180, durationWalkingSec: 180, durationPublicTransportSec: undefined,
        fareEstimateVND: { grab4: { min: 0, max: 0 }, grab7: { min: 0, max: 0 } }
      }
    },
    {
      id: "DN-D4-002", day: 4, date: "2026-04-06", slot: "night",
      name: "다낭 국제공항 이동 (20:30)",
      type: "transport", lat: 16.0544, lng: 108.2022, mapQuery: "다낭 국제공항 터미널2",
      dirMapUrl: "https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=16.0544,108.2022&travelmode=driving",
      placeUrl: "https://www.google.com/maps/search/?api=1&query=Da+Nang+International+Airport+Terminal+2",
      durationMin: 60, costVND: { min: 0, max: 0 },
      why: "22:40 다낭(다낭국제공항 터미널2) 출발 -> 05:05 서울(인천국제공항 터미널1) 도착. 2시간 전 도착 권장.",
      tips: ["마사지샵 공항 샌딩 차량 탑승", "남은 동(VND) 소진", "출국 심사 대기 시간 고려"],
      rainAlternative: null,
      businessHours: "24시간",
      closedDays: "연중무휴",
      routeFromPrev: {
        distanceMeters: 3000, durationSec: 500, durationWalkingSec: 2400, durationPublicTransportSec: undefined,
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

const fetchWeather = async (lat: number, lng: number, date: string): Promise<{ temp: number | null, condition: string }> => {
  try {
    const apiKey = import.meta.env.VITE_ACCUWEATHER_API_KEY;
    if (!apiKey) {
      console.error("AccuWeather API key is missing");
      return { temp: null, condition: "unavailable" };
    }

    // 1. 위도/경도로 Location Key 가져오기
    const locationRes = await fetch(`https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lng}`);
    if (!locationRes.ok) throw new Error('Location fetch failed');
    const locationData = await locationRes.json();
    const locationKey = locationData.Key;

    // 2. Location Key로 5일치 일기예보 가져오기 (metric=true로 섭씨 온도 요청)
    const forecastRes = await fetch(`https://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&metric=true`);
    if (!forecastRes.ok) throw new Error('Forecast fetch failed');
    const forecastData = await forecastRes.json();

    // 3. 요청한 날짜에 해당하는 예보 찾기 (예: "2026-04-03T07:00:00+07:00")
    const dailyForecast = forecastData.DailyForecasts.find((d: any) => d.Date.startsWith(date));

    if (dailyForecast) {
      const temp = Math.round(dailyForecast.Temperature.Maximum.Value);
      const iconCode = dailyForecast.Day.Icon;
      
      // AccuWeather 아이콘 코드를 앱의 날씨 상태로 매핑
      let condition = 'cloudy';
      if (iconCode >= 1 && iconCode <= 5) {
        condition = 'sunny'; // 맑음 ~ 대체로 맑음
      } else if (iconCode >= 12 && iconCode <= 18) {
        condition = 'rain'; // 비, 소나기, 뇌우
      } else if (iconCode >= 39 && iconCode <= 42) {
        condition = 'rain'; // 밤 비
      } else if (iconCode >= 33 && iconCode <= 34) {
        condition = 'sunny'; // 맑은 밤
      }

      return { temp, condition };
    }
    
    return { temp: null, condition: "unavailable" };
  } catch (error) {
    console.error("Failed to fetch AccuWeather data:", error);
    return { temp: null, condition: "unavailable" };
  }
};

import { globalExchangeRate, setGlobalExchangeRate, formatVND, formatKRW, formatVNDRange } from './utils';

// --- 도우미 함수 ---

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

const Checklist = () => {
  const defaultItems = [
    { id: 1, text: "여권 (유효기간 6개월 이상)", checked: false },
    { id: 2, text: "환전 (달러 또는 5만원권)", checked: false },
    { id: 3, text: "유심 / 이심 / 로밍 신청", checked: false },
    { id: 4, text: "여행자 보험 가입", checked: false },
    { id: 5, text: "그랩(Grab) 앱 미리 설치 및 카드 등록", checked: false },
    { id: 6, text: "상비약 (소화제, 지사제, 두통약, 감기약, 밴드, 연고)", checked: false },
    { id: 7, text: "모기 기피제, 버물리", checked: false },
    { id: 8, text: "샤워기 필터 (베트남 수질 대비)", checked: false },
    { id: 9, text: "칫솔, 치약 (호텔 어메니티 확인)", checked: false },
    { id: 10, text: "선크림, 모자, 선글라스 (자외선 강함)", checked: false },
    { id: 11, text: "여유 반팔티 및 속옷 (땀이 많이 나므로 넉넉히)", checked: false },
    { id: 12, text: "얇은 겉옷 (실내 에어컨/바나힐 쌀쌀함)", checked: false },
    { id: 13, text: "수영복, 아쿠아슈즈, 방수팩", checked: false },
    { id: 14, text: "우산 또는 우비 (우천 대비)", checked: false },
    { id: 15, text: "물티슈, 휴지", checked: false },
    { id: 16, text: "손선풍기 (더위 대비)", checked: false },
    { id: 17, text: "보조배터리 & 충전기", checked: false },
    { id: 18, text: "알로에 젤 (햇빛에 탄 피부 진정용)", checked: false },
  ];

  const [items, setItems] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('danang_trip_checklist');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return defaultItems;
  });

  const saveItems = (newItems: any[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('danang_trip_checklist', JSON.stringify(newItems));
    }
  };

  const toggleCheck = (id: number) => {
    const newItems = items.map((item: any) => 
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setItems(newItems);
    saveItems(newItems);
  };

  const resetList = () => {
    if (window.confirm("체크리스트를 초기화하시겠습니까?")) {
      setItems(defaultItems);
      saveItems(defaultItems);
    }
  };

  const progress = Math.round((items.filter((i: any) => i.checked).length / items.length) * 100);

  return (
    <div className="p-4 max-w-md mx-auto pb-24">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              여행 준비물 체크리스트
            </h2>
            <p className="text-xs text-indigo-600 mt-1">
              * 현재 기기에 자동 저장됩니다.
            </p>
          </div>
          <button 
            onClick={resetList}
            className="text-gray-400 hover:text-red-500 transition-colors p-2"
            title="초기화"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-gray-100 h-2 w-full">
          <div 
            className="bg-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {items.map((item: any) => (
            <div 
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${item.checked ? 'bg-gray-50/50' : ''}`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                item.checked 
                  ? 'bg-indigo-500 border-indigo-500 text-white' 
                  : 'border-gray-300 bg-white'
              }`}>
                {item.checked && <CheckSquare className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-sm flex-1 ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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

  const handleWeatherClick = () => {
    // 다낭의 AccuWeather 페이지로 이동 (한국어)
    window.open('https://www.accuweather.com/ko/vn/da-nang/352954/weather-forecast/352954', '_blank');
  };

  return (
    <div 
      className="bg-blue-600 text-white p-4 shadow-md transition-all cursor-pointer hover:bg-blue-700"
      onClick={handleWeatherClick}
      title="자세한 날씨 정보 보기"
    >
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
              {weather?.condition === 'sunny' && <Sun className="w-6 h-6 text-yellow-300" />}
              {weather?.condition === 'cloudy' && <Cloud className="w-6 h-6 text-gray-200" />}
              {weather?.condition === 'rain' && <CloudRain className="w-6 h-6 text-blue-300" />}
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
          onClick={() => onSelect(1000)}
          className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-4 border-b-2 ${
            selectedDay === 1000
              ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          준비물
          <span className="block text-[10px] font-normal">체크리스트</span>
        </button>
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

const GrabButton = ({ lat, lng, name, pickupLat, pickupLng }: { lat: number, lng: number, name: string, pickupLat?: number, pickupLng?: number }) => {
  const handleGrabClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // grab:// 딥링크 스키마를 사용하여 앱을 직접 실행합니다.
    let grabAppUrl = `grab://open?screenType=BOOKING&dropOffLatitude=${lat}&dropOffLongitude=${lng}&dropOffName=${encodeURIComponent(name)}`;
    
    if (pickupLat && pickupLng) {
      grabAppUrl += `&pickUpLatitude=${pickupLat}&pickUpLongitude=${pickupLng}`;
    }
    
    // 플랫폼별 스토어 URL 백업
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    let storeUrl = 'https://www.grab.com/download/'; // 기본 웹사이트
    
    if (/android/i.test(userAgent)) {
      storeUrl = 'https://play.google.com/store/apps/details?id=com.grabtaxi.passenger';
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      storeUrl = 'https://apps.apple.com/app/id648158248';
    }

    // 앱 실행 시도
    window.location.href = grabAppUrl;

    // 앱이 설치되어 있지 않은 경우를 위한 웹 링크 백업
    setTimeout(() => {
      if (!document.hidden) {
        // 앱 실행에 실패한 경우 (브라우저가 여전히 활성 상태인 경우)
        window.open(storeUrl, '_blank');
      }
    }, 2500);
  };

  return (
    <button
      onClick={handleGrabClick}
      className="w-full mt-3 bg-[#00B14F] hover:bg-[#009e47] text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
    >
      <Car className="w-4 h-4" />
      Grab 앱으로 호출 (목적지 자동 설정)
    </button>
  );
};

const ItineraryCard: React.FC<{ item: ItineraryItem, prevItem?: ItineraryItem, showRouteInfo?: boolean }> = ({ item, prevItem, showRouteInfo = true }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  const handleReservationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.reservationUrl) {
      window.open(item.reservationUrl, '_blank');
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      scrollRef.current.scrollBy({
        left: direction === 'right' ? clientWidth : -clientWidth,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-6 relative">
      {/* 이전 장소에서의 이동 선 */}
      {item.routeFromPrev && showRouteInfo && (
        <div className="absolute -top-6 left-6 w-0.5 h-6 bg-gray-300"></div>
      )}

      {/* 이동 정보 */}
      {item.routeFromPrev && showRouteInfo && (
        <div className="mx-4 mb-2 bg-gray-50 rounded p-2 text-xs text-gray-500 border border-gray-100">
          <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-1 font-medium text-gray-700">
                <Navigation className="w-3 h-3 text-blue-500" />
                <span>이동: {(item.routeFromPrev.distanceMeters / 1000).toFixed(1)}km</span>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Car className="w-4 h-4 text-blue-500 mb-1" />
              <span className="font-bold text-gray-800">{Math.round(item.routeFromPrev.durationSec/60)}분</span>
              <span className="text-[10px] text-gray-400">택시/그랩</span>
            </div>
            
            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Footprints className="w-4 h-4 text-green-500 mb-1" />
              <span className="font-bold text-gray-800">
                {item.routeFromPrev.durationWalkingSec ? `${Math.round(item.routeFromPrev.durationWalkingSec/60)}분` : '-'}
              </span>
              <span className="text-[10px] text-gray-400">도보</span>
            </div>

            <div className="flex flex-col items-center p-1.5 bg-white rounded border border-gray-100 shadow-sm">
              <Bus className="w-4 h-4 text-purple-500 mb-1" />
              <span className="font-bold text-gray-800">
                {item.routeFromPrev.durationPublicTransportSec ? `${Math.round(item.routeFromPrev.durationPublicTransportSec/60)}분` : '-'}
              </span>
              <span className="text-[10px] text-gray-400">대중교통</span>
            </div>
          </div>

          <div className="text-right border-t border-gray-100 pt-2 mt-1">
            <div className="flex justify-between">
              <span>그랩 4인</span>
              <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab4.min, item.routeFromPrev.fareEstimateVND.grab4.max)}</span>
            </div>
            <div className="flex justify-between mt-0.5">
              <span>그랩 7인</span>
              <span className="font-semibold text-gray-700">{formatVNDRange(item.routeFromPrev.fareEstimateVND.grab7.min, item.routeFromPrev.fareEstimateVND.grab7.max)}</span>
            </div>
          </div>
          
          <GrabButton 
            lat={item.lat} 
            lng={item.lng} 
            name={item.name} 
            pickupLat={prevItem?.lat} 
            pickupLng={prevItem?.lng} 
          />
        </div>
      )}

      {/* 메인 카드 (가로 스크롤 슬라이더) */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto flex snap-x snap-mandatory pb-4 -mb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Slide 1: 기본 일정 */}
        <div className="min-w-full snap-center px-4">
          <div 
            onClick={handleRowClick}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-blue-50 transition-colors cursor-pointer ring-1 ring-transparent hover:ring-blue-200 h-full relative"
          >
            {/* 슬라이드 인디케이터 힌트 (버튼으로 변경) */}
            <button 
              onClick={(e) => { e.stopPropagation(); scroll('right'); }}
              className="absolute right-2 top-2 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 z-10"
            >
               <span className="text-[10px] font-medium">우천 시 대안</span>
               <ChevronRight className="w-3 h-3" />
            </button>

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
                {(item.businessHours || item.breakTime || item.closedDays || item.placeUrl || item.reservationUrl) && (
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
                    <div className="flex gap-2 flex-wrap">
                      {item.placeUrl && (
                        <a 
                          href={item.placeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-white border border-blue-200 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                        >
                          <MapPin className="w-3 h-3" />
                          구글맵
                        </a>
                      )}
                      {item.reservationUrl && (
                        <button 
                          onClick={handleReservationClick}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-indigo-500 border border-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-600 transition-colors shadow-sm"
                        >
                          <PenLine className="w-3 h-3" />
                          예약하기
                        </button>
                      )}
                    </div>
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
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide 2: 우천 시 대안 */}
        <div className="min-w-full snap-center px-4">
          <div className="bg-slate-50 rounded-xl shadow-inner border border-slate-200 p-4 h-full flex flex-col relative min-h-[180px]">
             <button 
               onClick={(e) => { e.stopPropagation(); scroll('left'); }}
               className="absolute left-2 top-2 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-gray-100 z-10"
             >
               <ChevronLeft className="w-3 h-3" />
               <span className="text-[10px] font-medium">기본 일정</span>
            </button>
            
            {item.rainAlternative ? (
              <div className="flex gap-4 mt-8">
                <div className="flex flex-col items-center">
                   <div className="p-2 bg-blue-100 rounded-full">
                     {getIcon(item.rainAlternative.type)}
                   </div>
                   <div className="h-full w-0.5 bg-blue-100 my-2"></div>
                </div>

                <div className="flex-1 text-left">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold uppercase tracking-wide text-blue-500">우천 시 추천</span>
                    {item.rainAlternative.placeUrl && (
                       <a 
                         href={item.rainAlternative.placeUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         onClick={(e) => e.stopPropagation()}
                         className="text-blue-400 hover:text-blue-600"
                       >
                         <MapPin className="w-4 h-4" />
                       </a>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 leading-tight mb-1">{item.rainAlternative.name}</h3>
                  <p className="text-sm text-slate-600 mb-3 italic">"{item.rainAlternative.why}"</p>

                  <div className="mb-3 bg-white rounded-lg p-3 border border-slate-200 flex flex-col gap-2 shadow-sm">
                    {item.rainAlternative.businessHours && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span><strong>영업:</strong> {item.rainAlternative.businessHours}</span>
                      </div>
                    )}
                    {item.rainAlternative.reservationUrl && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.rainAlternative?.reservationUrl) window.open(item.rainAlternative.reservationUrl, '_blank');
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-indigo-500 border border-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-600 transition-colors shadow-sm self-start"
                      >
                        <PenLine className="w-3 h-3" />
                        예약하기
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.rainAlternative.tips.map((tip, idx) => (
                      <span key={idx} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
                        ☔ {tip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-3 py-8 justify-center h-full">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Umbrella className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-500 mb-1">대안 일정 없음</h3>
                  <p className="text-sm text-gray-400">이 일정은 실내 활동이거나<br/>비가 와도 진행 가능합니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CurrencyConverter = () => {
  const [vnd, setVnd] = useState<string>("");
  const [krw, setKrw] = useState<string>("0");
  const [exchangeRate, setExchangeRate] = useState<number>(globalExchangeRate);
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(true);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/VND')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.KRW) {
          const rate = data.rates.KRW;
          setExchangeRate(rate);
          setGlobalExchangeRate(rate); // Update global rate for other components
        }
      })
      .catch(err => console.error('Failed to fetch exchange rate', err))
      .finally(() => setIsLoadingRate(false));
  }, []);

  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, "");
    if (value === "") {
      setVnd("");
      setKrw("0");
      return;
    }
    if (!isNaN(Number(value))) {
      setVnd(Number(value).toLocaleString('en-US'));
      setKrw(Math.round(Number(value) * exchangeRate).toLocaleString('en-US'));
    }
  };

  // Recalculate KRW when exchange rate changes
  useEffect(() => {
    if (vnd) {
      const value = Number(vnd.replace(/,/g, ""));
      if (!isNaN(value)) {
        setKrw(Math.round(value * exchangeRate).toLocaleString('en-US'));
      }
    }
  }, [exchangeRate, vnd]);

  const formatKoreanCurrency = (valueStr: string) => {
    const num = Number(valueStr.replace(/,/g, ""));
    if (isNaN(num) || num === 0) return "";
    
    const units = ["", "만", "억", "조"];
    let result = "";
    let temp = num;
    let unitIndex = 0;
    
    while (temp > 0) {
      const chunk = temp % 10000;
      if (chunk > 0) {
        result = `${chunk.toLocaleString('en-US')}${units[unitIndex]} ${result}`;
      }
      temp = Math.floor(temp / 10000);
      unitIndex++;
    }
    return result.trim();
  };

  return (
    <div className="mx-4 mb-6 bg-white rounded-xl shadow-sm border border-blue-100 p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        <span className="bg-green-100 text-green-700 p-1 rounded">₫</span>
        간편 환율 계산기
      </h3>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <input
              type="text"
              value={vnd}
              onChange={handleVndChange}
              placeholder="1,000,000"
              className="w-full pl-3 py-2 text-right focus:outline-none text-sm min-w-0"
            />
            <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
              VND
            </div>
          </div>
          <div className="text-right text-[10px] text-blue-500 mt-1 h-3 font-medium">
            {vnd ? `${formatKoreanCurrency(vnd)} 동` : ''}
          </div>
        </div>
        <div className="pt-2">
          <span className="text-gray-400">=</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <div className="w-full pl-3 py-2 text-right text-gray-700 text-sm min-w-0 truncate">
              {krw}
            </div>
            <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 border-l border-gray-200 whitespace-nowrap">
              KRW
            </div>
          </div>
          <div className="text-right text-[10px] text-green-500 mt-1 h-3 font-medium">
            {krw !== "0" && krw !== "" ? `약 ${formatKoreanCurrency(krw)} 원` : ''}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-1 text-right">
        {isLoadingRate ? (
          <span className="animate-pulse">실시간 환율 불러오는 중...</span>
        ) : (
          `* 실시간 환율 기준 (10,000동 ≈ ${Math.round(10000 * exchangeRate).toLocaleString()}원)`
        )}
      </p>
    </div>
  );
};

const MemoPad = () => {
  const [memo, setMemo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('danang_trip_memo') || "";
    }
    return "";
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMemo(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('danang_trip_memo', newValue);
    }
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
        <PenLine className="w-3 h-3" /> 작성한 내용은 현재 기기에 자동 저장됩니다.
      </p>
    </div>
  );
};

const App = () => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDay === 999 || selectedDay === 1000) return; // 메모/체크리스트 탭일 때는 API 호출 스킵
    setLoading(true);
    fetchItinerary(selectedDay).then(data => {
      setItinerary(data);
      setLoading(false);
    });
  }, [selectedDay]);

  const currentDayHeader = useMemo(() => 
    MOCK_TRIP_DATA.dayHeaders.find(d => d.day === selectedDay), 
  [selectedDay]);

  if (selectedDay !== 999 && selectedDay !== 1000 && !currentDayHeader) return <div className="p-10 text-center">여정 데이터를 불러오는 데 실패했습니다.</div>;

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
      ) : selectedDay === 1000 ? (
        <div className="bg-indigo-600 text-white p-4 shadow-md transition-all">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <div>
              <h2 className="text-lg font-bold">여행 준비물</h2>
              <p className="text-sm opacity-90">빠짐없이 챙기셨나요?</p>
            </div>
            <CheckSquare className="w-6 h-6" />
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
        ) : selectedDay === 1000 ? (
          <Checklist />
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
                {itinerary.length > 0 ? itinerary.map((item, index) => (
                  <ItineraryCard 
                    key={item.id} 
                    item={item} 
                    prevItem={index > 0 ? itinerary[index - 1] : undefined}
                    showRouteInfo={index > 0} 
                  />
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

const container = document.getElementById('root')!;
const root = (container as any)._reactRoot || createRoot(container);
(container as any)._reactRoot = root;
root.render(<App />);