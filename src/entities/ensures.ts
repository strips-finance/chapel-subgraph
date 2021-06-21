import { Address, BigDecimal } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { Account, Market, MarketPrice, OraclePrice, InsuranceFund, InsuranceStake, MarketStake, SLPToken } from '../generated/schema';
import { getERC20Symbol } from '../utils/getERC20Symbol';
import { logCritical } from '../utils/logCritical';
import { ethereum } from '@graphprotocol/graph-ts';
import { insuranceAddress } from '../addresses';

export function priceId(event: ethereum.Event): string {
    return event.block.timestamp.toString() + event.block.number.toString();
}

//TODO: can we use Interfaces here or something like that? How do that generics works?
export function ensureMarketPrice(market:Market, newPrice: BigDecimal, event: ethereum.Event): MarketPrice {
    let marketPrice = MarketPrice.load(priceId(event)) as MarketPrice;
    if (marketPrice){
        return marketPrice;
    }

    marketPrice = new MarketPrice(priceId(event));

    marketPrice.price = newPrice;
    marketPrice.market = market.id;
    marketPrice.timestamp = event.block.timestamp;

    marketPrice.save();

    return marketPrice;
}


export function ensureOraclePrice(market:Market, newPrice: BigDecimal, event: ethereum.Event): OraclePrice {
    let oraclePrice = OraclePrice.load(priceId(event)) as OraclePrice;
    if (oraclePrice){
        return oraclePrice;
    }

    oraclePrice = new OraclePrice(priceId(event));

    oraclePrice.price = newPrice;
    oraclePrice.market = market.id;
    oraclePrice.timestamp = event.block.timestamp;

    oraclePrice.save();

    return oraclePrice;
}



export function ensureInsurance(address: Address): InsuranceFund {
    if (address != insuranceAddress){
        logCritical('insuranceAddress wrong {}', [address.toHex()]);
    }

    let insurance = InsuranceFund.load(address.toHex()) as InsuranceFund;
    if (insurance != null){
        return insurance;
    }

    insurance = new InsuranceFund(address.toHex());
    insurance.save();

    return insurance;
}

export function ensureAccount(address: Address): Account {
    let account = Account.load(address.toHex()) as Account;
    if (account) {
      return account;
    }
    
    account = new Account(address.toHex());
    account.save();

    return account;
}

export function ensureIStake(account: Account, insurance: InsuranceFund): InsuranceStake {
    let stake = InsuranceStake.load(account.id + insurance.id) as InsuranceStake;
    if (stake) {
      return stake;
    }
    
    stake = new InsuranceStake(account.id + insurance.id);
    stake.insurance = insurance.id;
    stake.account = account.id;

    stake.save();

    return stake;
}

export function ensureMStake(account: Account, market: Market): MarketStake {
    let stake = MarketStake.load(account.id + market.id) as MarketStake;
    if (stake) {
      return stake;
    }
    
    stake = new MarketStake(account.id + market.id);
    stake.market = market.id;
    stake.account = account.id;

    stake.save();

    return stake;
}