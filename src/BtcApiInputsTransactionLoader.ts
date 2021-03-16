import * as _ from 'lodash';
import { SequenceExecutor } from '@ts-core/common/executor';
import { PromiseReflector } from '@ts-core/common/promise';
import { ObjectUtil } from '@ts-core/common/util';
import { BtcApi } from './BtcApi';
import { IBtcInput } from './IBtcInput';
import { ILogger } from '@ts-core/common/logger';

export class BtcApiInputsTransactionLoader extends SequenceExecutor<Array<IBtcInput>, void> {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(private api: BtcApi, logger?: ILogger, timeout?: number) {
        super(logger, timeout);
    }

    
    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async executeInput(inputs: Array<IBtcInput>): Promise<void> {
        let ids: Array<string> = _.uniq(_.compact(inputs.map(input => input.txid)));

        let promises = ids.map(id => PromiseReflector.create(this.api.getTransaction(id)));
        for (let promise of promises) {
            let item = await promise;
            if (item.isError) {
                throw item.error;
            }

            if (!_.isNil(this.logger)) {
                this.logger.debug(`Transaction ${item.value.txid} loaded`);
            }

            for (let input of inputs) {
                if (input.txid !== item.value.txid) {
                    continue;
                }
                let transaction = (input.tx = _.cloneDeep(item.value));
                transaction.vout = transaction.vout.filter(output => output.n === input.vout);

                if (transaction.vout.length === 0) {
                    if (!_.isNil(this.logger)) {
                        this.logger.error(`Input has zero vout: ${input}`);
                    }
                }
                ObjectUtil.clear(transaction, ['txid', 'vout']);
            }
        }
    }

    // --------------------------------------------------------------------------
    //
    //  Public Methods
    //
    // --------------------------------------------------------------------------

    public destroy(): void {
        if (this.isDestroyed) {
            return;
        }
        super.destroy();
        this.api = null;
    }
}
