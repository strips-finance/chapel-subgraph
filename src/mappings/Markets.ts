import { Address } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { Market, SLPToken, Account } from '../generated/schema';
import { getERC20Symbol } from '../utils/getERC20Symbol';
import { logCritical, logInfo } from '../utils/logCritical';
import { LiquidityChanged } from '../generated/IrsMarket';
import { LPToken } from '../generated/templates';
import { ensureAccount, ensureMStake} from '../entities/ensures';


export function handleMarketLiquidityChange(event: LiquidityChanged): void {
    logInfo('DEBUG EVENT LOG: LiquidityChanged event for market{}', [event.params.asset.toHex()]);

    let market = Market.load(event.params.asset.toHex()) as Market;
    if (market == null){
        logCritical('LiquidityChanged for none market {}', [event.params.asset.toHex()]);
        return;
    }

    market.liquidity = event.params.totalLiquidity.toBigDecimal();
    market.stakedPnl = event.params.currentStakedPnl.toBigDecimal();
    
    // If it's stake then we need to change 
    if (event.params.action.toString() == "STAKE" || event.params.action.toString() == "UNSTAKE"){
        liquidityChangeOnStake(market, event);
    }

    market.save();
}


function liquidityChangeOnStake(market: Market, event: LiquidityChanged): void {
    let account = ensureAccount(event.params.changer);

    let stake = ensureMStake(account, market);

    stake.collateralTotal = event.params.stakerTotalCollateral.toBigDecimal();
    stake.initialStakedPnl = event.params.stakerInitialStakedPnl.toBigDecimal();

    stake.save();
}