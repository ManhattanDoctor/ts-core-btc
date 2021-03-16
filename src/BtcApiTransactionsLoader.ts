import { SequenceExecutor } from '@ts-core/common/executor';
import { ILogger } from '@ts-core/common/logger';
import { PromiseReflector } from '@ts-core/common/promise';
import { BtcApi } from './BtcApi';
import { IBtcTransaction } from './IBtcTransaction';

export class BtcApiTransactionsLoader extends SequenceExecutor<Array<string>, Array<IBtcTransaction | Error>> {
    // --------------------------------------------------------------------------
    //
    //  Constructor
    //
    // --------------------------------------------------------------------------

    constructor(private api: BtcApi, protected logger: ILogger) {
        super();
    }

    // --------------------------------------------------------------------------
    //
    //  Protected Methods
    //
    // --------------------------------------------------------------------------

    protected async executeInput(value: Array<string>): Promise<Array<IBtcTransaction | Error>> {
        let promises = value.map(id => PromiseReflector.create<IBtcTransaction, Error>(this.api.getTransaction(id)));
        return (await Promise.all(promises)).map(item => (item.isComplete ? item.value : item.error));
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
