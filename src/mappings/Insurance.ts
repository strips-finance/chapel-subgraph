import { Address } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { InsuranceFund, SIPToken, Account, InsuranceStake } from '../generated/schema';
import { getERC20Symbol } from '../utils/getERC20Symbol';
import { logCritical, logInfo } from '../utils/logCritical';
import { TokenAdded, LiquidityChanged } from '../generated/InsurancePool';
import { LPToken } from '../generated/templates';
import { ensureAccount, ensureIStake, ensureInsurance } from '../entities/ensures';

export function handleSIPTokenAdded(event: TokenAdded): void {
    let sipToken = SIPToken.load(event.params.token.toHex()) as SIPToken;
    if (sipToken != null){
        logCritical('TokenAdded SIP duplicated event for token {}', [event.params.token.toHex()]);
        return;
    }

    let symbol = getERC20Symbol(event.params.token);
    if (symbol != "SIP"){
        logCritical('TokenAdded not SIP but {}', [symbol]);
        return;
    }

    let insurance = ensureInsurance(event.params.asset);

    sipToken = new SIPToken(event.params.token.toHex());
    sipToken.insurance = insurance.id;
    sipToken.symbol = symbol;
    
    insurance.token = sipToken.id;

    insurance.save()
    sipToken.save()

    LPToken.create(event.params.token);
}

export function handleInsuranceLiquidityChange(event: LiquidityChanged): void {
    logInfo('DEBUG EVENT LOG: LiquidityChanged event for insurance{}', [event.params.asset.toHex()]);

    let insurance = ensureInsurance(event.params.asset);
    
    insurance.liquidity = event.params.totalLiquidity.toBigDecimal();
    insurance.stakedPnl = event.params.currentStakedPnl.toBigDecimal();
    
    // If it's stake then we need to change 
    if (event.params.action.toString() == "STAKE" || event.params.action.toString() == "UNSTAKE"){
        liquidityChangeOnStake(insurance, event);
    }

    insurance.save();
}


function liquidityChangeOnStake(insurance: InsuranceFund, event: LiquidityChanged): void {
    let account = ensureAccount(event.params.changer) as Account;

    let stake = ensureIStake(account, insurance);

    stake.collateralTotal = event.params.stakerTotalCollateral.toBigDecimal();
    stake.initialStakedPnl = event.params.stakerInitialStakedPnl.toBigDecimal();

    stake.save();
}