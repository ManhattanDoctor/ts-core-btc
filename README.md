# @ts-core/btc

TypeScript библиотека для взаимодействия с блокчейном Bitcoin через RPC. Предоставляет классы для получения блоков, транзакций и управления входами/выходами.

## Содержание

- [Установка](#установка)
- [Зависимости](#зависимости)
- [Быстрый старт](#быстрый-старт)
- [API Reference](#api-reference)
- [Интерфейсы](#интерфейсы)
- [Типы выходов](#типы-выходов)
- [Примеры использования](#примеры-использования)
- [Настройка Bitcoin ноды](#настройка-bitcoin-ноды)

## Установка

```bash
npm install @ts-core/btc
```

```bash
yarn add @ts-core/btc
```

```bash
pnpm add @ts-core/btc
```

## Зависимости

| Пакет | Описание |
|-------|----------|
| `@ts-core/common` | Базовые классы и интерфейсы |
| `bitcoind-rpc` | RPC клиент для Bitcoin ноды |

## Быстрый старт

### Создание клиента

```typescript
import { BtcApiClient } from '@ts-core/btc';
import { Logger } from '@ts-core/common';

const client = new BtcApiClient({
    endpoint: 'http://user:password@127.0.0.1:8332'
}, new Logger());
```

### Получение информации о блоке

```typescript
// Получение текущей высоты блокчейна
const blockNumber = await client.getBlockNumber();
console.log('Текущий блок:', blockNumber);

// Получение блока по номеру
const block = await client.getBlock(blockNumber);
console.log('Хеш блока:', block.hash);
console.log('Транзакций:', block.transactions.length);
console.log('Дата создания:', block.createdDate);
```

### Работа с транзакциями

```typescript
// Получение транзакции по хешу
const tx = await client.getTransaction('txid_hash_here');
console.log('Входов:', tx.vin.length);
console.log('Выходов:', tx.vout.length);

// Получение транзакции с загруженными входами
const txWithInputs = await client.getTransaction('txid_hash_here', true);
// Теперь в tx.vin[].tx будут загружены предыдущие транзакции
```

### Отправка транзакции

```typescript
// Отправка подписанной транзакции в сеть
const txHash = await client.sendRawTransaction(signedTxHex);
console.log('Транзакция отправлена:', txHash);
```

## API Reference

### BtcApiClient

Основной класс для взаимодействия с Bitcoin нодой.

#### Конструктор

```typescript
constructor(settings: IBtcApiSettings, logger?: ILogger)
```

| Параметр | Тип | Описание |
|----------|-----|----------|
| `settings` | `IBtcApiSettings` | Настройки подключения |
| `logger` | `ILogger` | Опциональный логгер |

#### Методы

| Метод | Возвращаемый тип | Описание |
|-------|------------------|----------|
| `getBlockNumber()` | `Promise<number>` | Получить текущую высоту блокчейна |
| `getBlock(block)` | `Promise<IBtcBlock>` | Получить блок по высоте |
| `getTransaction(txid, isNeedInputs?)` | `Promise<IBtcTransaction>` | Получить транзакцию по хешу |
| `sendRawTransaction(data)` | `Promise<string>` | Отправить подписанную транзакцию |
| `loadInputs(source, logger)` | `Promise<void>` | Загрузить детали входов для транзакции/блока |
| `destroy()` | `void` | Освободить ресурсы |

#### Статические методы

| Метод | Описание |
|-------|----------|
| `BtcApiClient.parseBlock(block, logger)` | Парсинг и обогащение данных блока |
| `BtcApiClient.parseTransaction(tx, logger)` | Парсинг и обогащение данных транзакции |

## Интерфейсы

### IBtcApiSettings

Настройки подключения к Bitcoin ноде:

```typescript
interface IBtcApiSettings {
    endpoint: string;  // URL RPC эндпоинта с учётными данными
}
```

Формат endpoint: `http://username:password@host:port`

### IBtcBlock

Интерфейс блока Bitcoin:

```typescript
interface IBtcBlock {
    hash: string;               // Хеш блока
    height: number;             // Высота блока
    number: number;             // Алиас для height
    time: number;               // Unix timestamp
    createdDate: Date;          // Дата создания (парсится автоматически)
    tx: IBtcTransaction[];      // Оригинальный массив транзакций
    transactions: IBtcTransaction[]; // Алиас для tx
}
```

### IBtcTransaction

Интерфейс транзакции Bitcoin:

```typescript
interface IBtcTransaction {
    txid: string;          // Идентификатор транзакции
    vin: IBtcInput[];      // Массив входов
    vout: IBtcOutput[];    // Массив выходов
}
```

### IBtcInput

Интерфейс входа транзакции:

```typescript
interface IBtcInput {
    txid?: string;         // ID предыдущей транзакции
    vout?: number;         // Индекс выхода предыдущей транзакции
    coinbase?: string;     // Coinbase данные (для coinbase транзакций)
    tx?: IBtcTransaction;  // Загруженная предыдущая транзакция
}
```

### IBtcOutput

Интерфейс выхода транзакции:

```typescript
interface IBtcOutput {
    value: number;          // Сумма в BTC
    n: number;              // Индекс выхода
    address?: string;       // Адрес получателя (для стандартных выходов)
    addresses?: string[];   // Массив адресов (для multisig)
    type: BtcOutputType;    // Тип выхода
    scriptPubKey: any;      // Скрипт блокировки
}
```

## Типы выходов

Библиотека поддерживает различные типы Bitcoin выходов:

```typescript
enum BtcOutputType {
    PUB_KEY = 'pubkey',                      // Pay-to-Public-Key (P2PK)
    PUB_KEY_HASH = 'pubkeyhash',             // Pay-to-Public-Key-Hash (P2PKH)
    SCRIPT_HASH = 'scripthash',              // Pay-to-Script-Hash (P2SH)
    MULTI_SIGN = 'multisig',                 // Мультиподпись
    NULL_DATA = 'nulldata',                  // OP_RETURN (данные)
    NON_STANDART = 'nonstandard',            // Нестандартный
    WITNESS_V0_KEY_HASH = 'witness_v0_keyhash',     // Native SegWit P2WPKH
    WITNESS_V0_SCRIPT_HASH = 'witness_v0_scripthash' // Native SegWit P2WSH
}
```

| Тип | Описание | Пример адреса |
|-----|----------|---------------|
| `pubkeyhash` | Классический адрес | `1BvBMSE...` |
| `scripthash` | P2SH адрес (часто multisig) | `3J98t1W...` |
| `witness_v0_keyhash` | Native SegWit | `bc1q...` |
| `witness_v0_scripthash` | SegWit P2WSH | `bc1q...` (длиннее) |
| `nulldata` | OP_RETURN | — |

## Примеры использования

### Обозреватель блоков

```typescript
import { BtcApiClient, IBtcBlock } from '@ts-core/btc';
import { Logger } from '@ts-core/common';

async function exploreBlock(blockNumber: number): Promise<void> {
    const logger = new Logger();
    const client = new BtcApiClient({
        endpoint: 'http://user:pass@localhost:8332'
    }, logger);

    const block = await client.getBlock(blockNumber);

    console.log(`Блок #${block.number}`);
    console.log(`Хеш: ${block.hash}`);
    console.log(`Время: ${block.createdDate.toISOString()}`);
    console.log(`Транзакций: ${block.transactions.length}`);

    for (const tx of block.transactions) {
        console.log(`  TX: ${tx.txid}`);
        console.log(`    Входов: ${tx.vin.length}, Выходов: ${tx.vout.length}`);

        // Анализ выходов
        for (const output of tx.vout) {
            if (output.address) {
                console.log(`    → ${output.address}: ${output.value} BTC`);
            }
        }
    }

    client.destroy();
}
```

### Отслеживание адреса

```typescript
import { BtcApiClient, IBtcTransaction, IBtcOutput } from '@ts-core/btc';

async function findTransactionsForAddress(
    client: BtcApiClient,
    address: string,
    fromBlock: number,
    toBlock: number
): Promise<{ received: IBtcOutput[], sent: IBtcOutput[] }> {
    const received: IBtcOutput[] = [];
    const sent: IBtcOutput[] = [];

    for (let i = fromBlock; i <= toBlock; i++) {
        const block = await client.getBlock(i);

        for (const tx of block.transactions) {
            // Проверяем выходы (получения)
            for (const output of tx.vout) {
                if (output.address === address) {
                    received.push(output);
                }
            }
        }
    }

    return { received, sent };
}
```

### Загрузка входов транзакции

```typescript
import { BtcApiClient } from '@ts-core/btc';

async function analyzeTransaction(client: BtcApiClient, txid: string): Promise<void> {
    // Загружаем транзакцию с входами
    const tx = await client.getTransaction(txid, true);

    console.log(`Анализ транзакции ${txid}:`);

    // Теперь можем увидеть откуда пришли средства
    for (const input of tx.vin) {
        if (input.coinbase) {
            console.log('  Coinbase транзакция (награда за блок)');
        } else if (input.tx) {
            const prevOutput = input.tx.vout[input.vout];
            console.log(`  Вход: ${prevOutput.value} BTC от ${prevOutput.address}`);
        }
    }

    // Выходы
    let totalOutput = 0;
    for (const output of tx.vout) {
        totalOutput += output.value;
        console.log(`  Выход: ${output.value} BTC → ${output.address || output.type}`);
    }

    console.log(`  Итого выходов: ${totalOutput} BTC`);
}
```

## Настройка Bitcoin ноды

### bitcoin.conf

Для работы библиотеки необходима Bitcoin нода с включённым RPC:

```ini
# Включить RPC сервер
server=1
rpcuser=myuser
rpcpassword=mypassword
rpcport=8332

# Разрешить подключения (для продакшена настройте firewall)
rpcallowip=127.0.0.1

# Индексация транзакций (необходимо для getTransaction)
txindex=1
```

### Подключение

```typescript
// Локальная нода
const localClient = new BtcApiClient({
    endpoint: 'http://myuser:mypassword@127.0.0.1:8332'
});

// Testnet
const testnetClient = new BtcApiClient({
    endpoint: 'http://myuser:mypassword@127.0.0.1:18332'
});
```

## Обработка ошибок

```typescript
import { ExtendedError } from '@ts-core/common';

try {
    const block = await client.getBlock(999999999);
} catch (error) {
    if (error instanceof ExtendedError) {
        console.log('Код ошибки:', error.code);
        console.log('Сообщение:', error.message);
    }
}
```

## Связанные пакеты

| Пакет | Описание |
|-------|----------|
| `@ts-core/eth` | Аналогичная библиотека для Ethereum |
| `@ts-core/common` | Базовые классы и интерфейсы |

## Автор

**Renat Gubaev** — [renat.gubaev@gmail.com](mailto:renat.gubaev@gmail.com)

- GitHub: [ManhattanDoctor](https://github.com/ManhattanDoctor)
- Репозиторий: [ts-core-btc](https://github.com/ManhattanDoctor/ts-core-btc)

## Лицензия

ISC
