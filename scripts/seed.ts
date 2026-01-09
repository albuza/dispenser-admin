import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { createHash, randomBytes } from 'crypto';

const dynamodb = new DynamoDBClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
  credentials: process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.APP_ACCESS_KEY_ID,
        secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const TABLES = {
  VENUES: 'venues',
  BEERS: 'beers',
  VENUE_DISPENSERS: 'venue_dispensers',
  USERS: 'users',
};

function generateId(): string {
  return randomBytes(16).toString('hex');
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

const now = Date.now();

// 관리자 계정
const users = [
  {
    user_id: generateId(),
    email: 'admin@greenbear.com',
    password_hash: hashPassword('admin123'),
    name: '슈퍼관리자',
    phone: '010-1234-5678',
    role: 'super_admin',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    user_id: generateId(),
    email: 'owner@greenbear.com',
    password_hash: hashPassword('owner123'),
    name: '매장운영자',
    phone: '010-9876-5432',
    role: 'venue_owner',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

// 매장 정보
const venues = [
  {
    venue_id: 'venue-greenbear-main',
    name: '초록곰 브루어리 본점',
    address: '인천 강화군 강화읍 중앙로 123',
    owner_id: users[1].user_id,
    business_number: '123-45-67890',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    venue_id: 'venue-jamsil-stadium',
    name: '잠실야구장 3루측',
    address: '서울 송파구 올림픽로 25',
    owner_id: users[1].user_id,
    business_number: '234-56-78901',
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

// 초록곰 맥주 정보
const beers = [
  {
    beer_id: 'beer-goguma-lager',
    name: '고구마라거',
    brand: '초록곰맥주',
    style: 'Sweet Potato Lager',
    abv: 5.0,
    description: '강화도 고구마의 달콤함을 담은 특별한 라거',
    image_url: 'https://albuza00.cafe24.com/img/1.png',
    default_price: 7000,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-ganghwa-ipa',
    name: '강화에일',
    brand: '초록곰맥주',
    style: 'Ganghwa IPA',
    abv: 6.8,
    description: '강화도의 일몰을 담은 깊은 맛',
    image_url: 'https://albuza00.cafe24.com/img/2.png',
    default_price: 8000,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-manisan-lager',
    name: '마니산라거',
    brand: '초록곰맥주',
    style: 'Lager',
    abv: 5.0,
    description: '마니산의 청량한 공기를 담은 라거',
    image_url: 'https://albuza00.cafe24.com/img/3.png',
    default_price: 6000,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-dongmak-ale',
    name: '동막에일',
    brand: '초록곰맥주',
    style: 'Ganghwa Pale Ale',
    abv: 6.2,
    description: '강화도 동막해변의 청량감을 담은 맥주',
    image_url: 'https://albuza00.cafe24.com/img/4.png',
    default_price: 7500,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-single-bear',
    name: '싱글베어',
    brand: '초록곰맥주',
    style: 'Pale Ale',
    abv: 4.7,
    description: '여름날의 해변에서 즐기는 상큼한 맥주',
    image_url: 'https://albuza00.cafe24.com/img/5.png',
    default_price: 6500,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-green-bear-neipa',
    name: '싱그러운 초록색 곰',
    brand: '초록곰맥주',
    style: 'DDH NEIPA',
    abv: 6.2,
    description: '깊이 있는 홉의 향과 부드러운 질감',
    image_url: 'https://albuza00.cafe24.com/img/6.png',
    default_price: 8500,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-upcheongnan-bear',
    name: '업청난곰',
    brand: '초록곰맥주',
    style: 'IPA',
    abv: 6.8,
    description: '인도 여행을 떠나는 듯한 이국적인 맛',
    image_url: 'https://albuza00.cafe24.com/img/7.png',
    default_price: 8000,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-black-bear',
    name: '블랙베어',
    brand: '초록곰맥주',
    style: 'Stout',
    abv: 4.7,
    description: '깊은 커피향과 초콜릿의 달콤함',
    image_url: 'https://albuza00.cafe24.com/img/8.png',
    default_price: 7000,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    beer_id: 'beer-wit-bear',
    name: '위트베어',
    brand: '초록곰맥주',
    style: 'Wit Bier',
    abv: 4.7,
    description: '상큼한 시트러스와 은은한 향신료',
    image_url: 'https://albuza00.cafe24.com/img/9.png',
    default_price: 6500,
    default_volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

// 매장-디스펜서 매핑 (본점에 4개 디스펜서)
const venueDispensers = [
  {
    venue_id: 'venue-greenbear-main',
    dispenser_id: 'D4:8A:FC:A6:73:08', // 실제 ESP32 MAC
    beer_id: 'beer-goguma-lager',
    dispenser_number: 1,
    position_description: '입구 왼쪽',
    price: 7000,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    venue_id: 'venue-greenbear-main',
    dispenser_id: 'TEST-DISPENSER-02',
    beer_id: 'beer-ganghwa-ipa',
    dispenser_number: 2,
    position_description: '입구 오른쪽',
    price: 8000,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    venue_id: 'venue-greenbear-main',
    dispenser_id: 'TEST-DISPENSER-03',
    beer_id: 'beer-manisan-lager',
    dispenser_number: 3,
    position_description: '중앙',
    price: 6000,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    venue_id: 'venue-greenbear-main',
    dispenser_id: 'TEST-DISPENSER-04',
    beer_id: 'beer-black-bear',
    dispenser_number: 4,
    position_description: '카운터 옆',
    price: 7000,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  // 잠실야구장 디스펜서
  {
    venue_id: 'venue-jamsil-stadium',
    dispenser_id: 'JAMSIL-DISPENSER-01',
    beer_id: 'beer-manisan-lager',
    dispenser_number: 1,
    position_description: '3루측 매점',
    price: 8000,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    venue_id: 'venue-jamsil-stadium',
    dispenser_id: 'JAMSIL-DISPENSER-02',
    beer_id: 'beer-single-bear',
    dispenser_number: 2,
    position_description: '3루측 매점',
    price: 8500,
    volume_ml: 500,
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

async function seed() {
  console.log('🌱 시드 데이터 입력 시작...\n');

  // Users
  console.log('👤 사용자 데이터 입력...');
  for (const user of users) {
    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.USERS,
      Item: marshall(user, { removeUndefinedValues: true }),
    }));
    console.log(`  ✓ ${user.name} (${user.email})`);
  }

  // Venues
  console.log('\n🏢 매장 데이터 입력...');
  for (const venue of venues) {
    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.VENUES,
      Item: marshall(venue, { removeUndefinedValues: true }),
    }));
    console.log(`  ✓ ${venue.name}`);
  }

  // Beers
  console.log('\n🍺 맥주 데이터 입력...');
  for (const beer of beers) {
    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.BEERS,
      Item: marshall(beer, { removeUndefinedValues: true }),
    }));
    console.log(`  ✓ ${beer.name} (${beer.style}, ${beer.abv}%)`);
  }

  // Venue Dispensers
  console.log('\n🚰 디스펜서 매핑 데이터 입력...');
  for (const vd of venueDispensers) {
    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.VENUE_DISPENSERS,
      Item: marshall(vd, { removeUndefinedValues: true }),
    }));
    const venue = venues.find(v => v.venue_id === vd.venue_id);
    const beer = beers.find(b => b.beer_id === vd.beer_id);
    console.log(`  ✓ ${venue?.name} - ${vd.dispenser_number}번 디스펜서 → ${beer?.name}`);
  }

  console.log('\n✅ 시드 데이터 입력 완료!');
  console.log('\n📋 테스트 계정:');
  console.log('  슈퍼관리자: admin@greenbear.com / admin123');
  console.log('  매장운영자: owner@greenbear.com / owner123');
  console.log('\n🔗 테스트 URL:');
  console.log('  매장 QR: /order?venue=venue-greenbear-main');
  console.log('  디스펜서 QR: /order?venue=venue-greenbear-main&dispenser=D4:8A:FC:A6:73:08');
}

seed().catch(console.error);
