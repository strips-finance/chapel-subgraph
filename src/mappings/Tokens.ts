import { Address, BigInt } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { getERC20Symbol } from '../utils/getERC20Symbol';
import { getERC20Supply } from '../utils/getERC20Supply';
import { logCritical, logInfo } from '../utils/logCritical';
import { ethereum } from '@graphprotocol/graph-ts';
import { SLPToken, SIPToken, Market, Account } from '../generated/schema';
import { Transfer } from '../generated/SLPToken';
import { zeroAddress } from '../constants';
import { ensureAccount, ensureInsurance, ensureIStake, ensureMStake } from '../entities/ensures';

enum TransferAction {
    mint,   // from = address(0)
    burn,   // tp = address(0)
    transfer
}

// General routing handler
export function handleTransfer(event: Transfer): void {
    let slpToken = SLPToken.load(event.address.toHex()) as SLPToken;

    if (slpToken != null){
        implSLPTransfer(slpToken, event);
        return;
    }

    let sipToken = SIPToken.load(event.address.toHex()) as SIPToken;

    if (sipToken != null){
        implSIPTransfer(sipToken, event);
        return;
    }

    logCritical('handleTransfer for unknow token {}', [event.address.toHex()]);
}

function implSLPTransfer(slpToken: SLPToken, event: Transfer): void {
    logInfo('DEBUG EVENT LOG: implSLPTransfer event');

    let action = detectAction(event.params.from, event.params.to);
    let market = Market.load(slpToken.market) as Market;
    if (market == null){
        logCritical('implSLPTransfer market not exist for token {}', [slpToken.id]);
        return;
    }
    
    if (action == TransferAction.transfer){
        // Tokens are transfered from one account to another we don't support it yet
        logCritical('handleTransfer  transfer not supported for token {}', [event.address.toHex()]);
        return;
    }
    let accountAddress = event.params.to; // mint by default
    let amount = event.params.value;

    if (action == TransferAction.burn){
        accountAddress = event.params.from;
        amount = amount.times(BigInt.fromI32(-1));
    }

    let account = ensureAccount(accountAddress);
    let stake = ensureMStake(account, market);
    
    stake.slpTotal = stake.slpTotal + amount;
    stake.save()

    slpToken.totalSupply = getERC20Supply(event.address);
    slpToken.save();
}

function implSIPTransfer(sipToken: SIPToken, event: Transfer): void {
    logInfo('DEBUG EVENT LOG: implSIPTransfer event');

    let action = detectAction(event.params.from, event.params.to);
    let insurace = ensureInsurance(Address.fromString(sipToken.insurance.toString()));

    if (action == TransferAction.transfer){
        // Tokens are transfered from one account to another we don't support it yet
        logCritical('handleTransfer  transfer not supported for token {}', [event.address.toHex()]);
        return;
    }
    let accountAddress = event.params.to; // mint by default
    let amount = event.params.value;

    if (action == TransferAction.burn){
        accountAddress = event.params.from;
        amount = amount.times(BigInt.fromI32(-1));
    }

    let account = ensureAccount(accountAddress);
    let stake = ensureIStake(account, insurace);
    
    stake.sipTotal = stake.sipTotal + amount;
    stake.save()

    sipToken.totalSupply = getERC20Supply(event.address);
    sipToken.save();
}


function detectAction(from: Address, to: Address) : TransferAction {
    if (from == zeroAddress){
        return TransferAction.mint;
    }

    if (to == zeroAddress){
        return TransferAction.burn;
    }

    return TransferAction.transfer;
}