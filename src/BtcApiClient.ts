import { ExtendedError } from '@ts-core/common/error';
import { ILogger, LoggerWrapper } from '@ts-core/common/logger';
import { PromiseHandler } from '@ts-core/common/promise';
import { DateUtil, ObjectUtil } from '@ts-core/common/util';
import * as RpcClient from 'bitcoind-rpc';
import * as _ from 'lodash';
import { BtcApiInputsTransactionLoader } from './BtcApiInputsTransactionLoader';
import { IBtcBlock } from './IBtcBlock';
import { IBtcInput } from './IBtcInput';
import { BtcOutputType, IBtcOutput } from './IBtcOutput';
import { IBtcTransaction } from './IBtcTransaction';

export class BtcApiClient extends LoggerWrapper {
    // --------------------------------------------------------------------------
    //
    // 	Static Methods
    //
    // --------------------------------------------------------------------------

    public static parseBlock(item: IBtcBlock, logger: ILogger): void {
        if (_.isNil(item)) {
            return;
        }
        item.number = item.height;
        item.createdDate = DateUtil.parseDate(item.time * DateUtil.MILISECONDS_SECOND);

        item.transactions = item.tx;
        item.transactions.forEach(item => BtcApiClient.parseTransaction(item, logger));
    }

    public static parseTransaction(item: IBtcTransaction, logger: ILogger): void {
        if (_.isNil(item)) {
            return;
        }
        item.vin.forEach(item => BtcApiClient.parseInput(item, logger));
        item.vout.forEach(item => BtcApiClient.parseOutput(item, logger));
    }

    public static parseInput(item: IBtcInput, logger: ILogger): void {
        if (_.isNil(item)) {
            return;
        }

        if (!_.isNil(item.coinbase) || _.isNil(item.tx)) {
            return;
        }

        try {
            item.tx.vout.forEach(item => BtcApiClient.parseOutput(item, logger));
        } catch (error) {
            if (!_.isNil(logger)) {
                logger.error(`Unable to parse output for "${item.txid}": ${error}`);
            }
        }
    }

    private static parseOutput(item: IBtcOutput, logger: ILogger): void {
        if (_.isNil(item.scriptPubKey)) {
            return;
        }

        item.type = item.scriptPubKey.type as BtcOutputType;
        item.addresses = item.scriptPubKey.addresses;

        switch (item.type) {
            case BtcOutputType.PUB_KEY:
            case BtcOutputType.SCRIPT_HASH: // TODO: need to check!
            case BtcOutputType.PUB_KEY_HASH:
                if (!_.isEmpty(item.addresses) && item.addresses.length === 1) {
                    item.address = item.addresses[0];
                } else if (!_.isNil(logger)) {
                    logger.warn(`Transaction ${item.type} ouput has incorrect addresses (empty or more than one)`);
                }
                break;
            case BtcOutputType.NULL_DATA:
            case BtcOutputType.MULTI_SIGN:
            case BtcOutputType.NON_STANDART:
            case BtcOutputType.WITNESS_V0_KEY_HASH:
            case BtcOutputType.WITNESS_V0_SCRIPT_HASH:
                break;
            default:
                console.log(item.type);
                console.log(item);
        }
    }

    // --------------------------------------------------------------------------
    //
    // 	Private Properties
    //
    // --------------------------------------------------------------------------

    private client: RpcClient;

    // --------------------------------------------------------------------------
    //
    // 	Public Methods
    //
    // --------------------------------------------------------------------------

    constructor(settings: IBtcApiSettings, logger?: ILogger) {
        super(logger);
        this.client = new RpcClient(settings.endpoint);
    }

    // --------------------------------------------------------------------------
    //
    // 	Private Methods
    //
    // --------------------------------------------------------------------------

    private call<T = any>(methodName: string, ...params): Promise<T> {
        if (_.isNil(params)) {
            params = [];
        }

        let promise = PromiseHandler.create<any, ExtendedError>();
        let method = this.client[methodName];
        params.push((error, data): void => {
            if (error) {
                promise.reject(new ExtendedError(error.message, error.code));
            } else {
                promise.resolve(data.result);
            }
        });
        method.apply(this.client, params);
        return promise.promise;
    }

    private isBlock(item: any): item is IBtcBlock {
        return ObjectUtil.instanceOf(item, ['tx', 'height']);
    }

    // --------------------------------------------------------------------------
    //
    // 	Input Methods
    //
    // --------------------------------------------------------------------------

    public async loadInputs(source: IBtcTransaction | IBtcBlock, logger: ILogger): Promise<void> {
        let inputs = this.getInputs(source as IBtcTransaction | IBtcBlock);
        if (_.isEmpty(inputs)) {
            return;
        }
        let item = new BtcApiInputsTransactionLoader(this, this.logger, 10 * DateUtil.MILISECONDS_MINUTE);
        await item.start(_.chunk(inputs, 15));
        item.destroy();

        if (this.isBlock(source)) {
            BtcApiClient.parseBlock(source, logger);
        } else {
            BtcApiClient.parseTransaction(source as IBtcTransaction, logger);
        }
    }

    private getInputs(item: IBtcBlock | IBtcTransaction): Array<IBtcInput> {
        let items = [];

        if (this.isBlock(item)) {
            for (let transaction of item.transactions) {
                items.push(...this.getInputs(transaction));
            }
        } else {
            item = item as IBtcTransaction;
            for (let input of item.vin) {
                if (!_.isNil(input.txid)) {
                    items.push(input);
                }
            }
        }
        return items;
    }

    private isError(data: any): boolean {
        return _.isNil(data) ? true : ObjectUtil.instanceOf(data, ['code', 'message']);
    }

    // --------------------------------------------------------------------------
    //
    // 	Public Methods
    //
    // --------------------------------------------------------------------------

    public async sendRawTransaction(data: string): Promise<string> {
        return this.call('sendRawTransaction', data);
    }

    public async getBlockNumber(): Promise<number> {
        let item = await this.call('getBlockchainInfo');
        return item.blocks;
    }

    public async getBlock(block: number): Promise<IBtcBlock> {
        let hash = await this.call('getBlockHash', block);
        let item = await this.call<IBtcBlock>('getBlock', hash, 2);
        BtcApiClient.parseBlock(item, this.logger);
        return item;
    }

    public async getTransaction(transaction: string | IBtcTransaction, isNeedInputs?: boolean): Promise<IBtcTransaction> {
        let item = _.isString(transaction) ? await this.call('getRawTransaction', transaction, 1) : (transaction as IBtcTransaction);
        if (!isNeedInputs) {
            return item;
        }
        await this.loadInputs(item, this.logger);
        BtcApiClient.parseTransaction(item, this.logger);
        return item;
    }

    public destroy(): void {
        this.client = null;
        this.logger = null;
    }
}

export interface IBtcApiSettings {
    endpoint: string;
}
