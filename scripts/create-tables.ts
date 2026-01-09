import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException
} from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({
  region: process.env.APP_REGION || 'ap-northeast-2',
  credentials: process.env.APP_ACCESS_KEY_ID && process.env.APP_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.APP_ACCESS_KEY_ID,
        secretAccessKey: process.env.APP_SECRET_ACCESS_KEY,
      }
    : undefined,
});

const tables = [
  {
    TableName: 'users',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-index',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'venues',
    KeySchema: [
      { AttributeName: 'venue_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'venue_id', AttributeType: 'S' },
      { AttributeName: 'owner_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'owner_id-index',
        KeySchema: [
          { AttributeName: 'owner_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'beers',
    KeySchema: [
      { AttributeName: 'beer_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'beer_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'venue_dispensers',
    KeySchema: [
      { AttributeName: 'venue_id', KeyType: 'HASH' },
      { AttributeName: 'dispenser_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'venue_id', AttributeType: 'S' },
      { AttributeName: 'dispenser_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'dispenser_id-index',
        KeySchema: [
          { AttributeName: 'dispenser_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'customers',
    KeySchema: [
      { AttributeName: 'customer_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'customer_id', AttributeType: 'S' },
      { AttributeName: 'phone', AttributeType: 'S' },
      { AttributeName: 'ci', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'phone-index',
        KeySchema: [
          { AttributeName: 'phone', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'ci-index',
        KeySchema: [
          { AttributeName: 'ci', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'orders',
    KeySchema: [
      { AttributeName: 'order_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'order_id', AttributeType: 'S' },
      { AttributeName: 'venue_id', AttributeType: 'S' },
      { AttributeName: 'customer_id', AttributeType: 'S' },
      { AttributeName: 'dispenser_id', AttributeType: 'S' },
      { AttributeName: 'created_at', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'venue_id-created_at-index',
        KeySchema: [
          { AttributeName: 'venue_id', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'customer_id-created_at-index',
        KeySchema: [
          { AttributeName: 'customer_id', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'dispenser_id-created_at-index',
        KeySchema: [
          { AttributeName: 'dispenser_id', KeyType: 'HASH' },
          { AttributeName: 'created_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: 'dispense_logs',
    KeySchema: [
      { AttributeName: 'log_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'log_id', AttributeType: 'S' },
      { AttributeName: 'dispenser_id', AttributeType: 'S' },
      { AttributeName: 'order_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'dispenser_id-timestamp-index',
        KeySchema: [
          { AttributeName: 'dispenser_id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'order_id-index',
        KeySchema: [
          { AttributeName: 'order_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function waitForTable(tableName: string) {
  let status = 'CREATING';
  while (status === 'CREATING') {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const result = await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
    status = result.Table?.TableStatus || 'UNKNOWN';
  }
  return status;
}

async function createTables() {
  console.log('🗄️  DynamoDB 테이블 생성 시작...\n');

  for (const tableConfig of tables) {
    try {
      console.log(`📦 ${tableConfig.TableName} 테이블 생성 중...`);

      await dynamodb.send(new CreateTableCommand(tableConfig as any));

      const status = await waitForTable(tableConfig.TableName);
      console.log(`  ✓ ${tableConfig.TableName} 생성 완료 (${status})`);

    } catch (error) {
      if (error instanceof ResourceInUseException) {
        console.log(`  ⏭️  ${tableConfig.TableName} 이미 존재함`);
      } else {
        console.error(`  ❌ ${tableConfig.TableName} 생성 실패:`, error);
        throw error;
      }
    }
  }

  console.log('\n✅ 모든 테이블 생성 완료!');
}

createTables().catch(console.error);
