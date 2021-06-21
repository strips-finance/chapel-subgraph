import { Address, BigInt } from '@graphprotocol/graph-ts';
import { ERC20Contract } from '../generated/ERC20Contract';
import { Market, Account, Position, SLPToken } from '../generated/schema';
import { getERC20Symbol } from '../utils/getERC20Symbol';
import { logCritical, logInfo } from '../utils/logCritical';
import { ethereum } from '@graphprotocol/graph-ts';
import { NewMarket, PositionOpened, PositionClosed, PositionLiquidated, PnlCalcEvent, OraclePriceUpdatedEvent} from '../generated/Strips';
import { IrsMarket, LPToken } from '../generated/templates';
import { ensureAccount, ensureMarketPrice, ensureOraclePrice} from '../entities/ensures';


export function handleNewMarket(event: NewMarket): void {
    logInfo('DEBUG EVENT LOG: NewMarket event for {}', [event.params.market.toHex()]);

    let market = Market.load(event.params.market.toHex()) as Market;
    if (market != null){
        logCritical('NewMarket duplicated event for {}', [event.params.market.toHex()]);
        return;
    }

    let slpToken = SLPToken.load(event.params.lpToken.toHex()) as SLPToken;
    if (slpToken){
        logCritical('NewMarket for existing slpToken  market={} slpToken={}', [event.params.market.toHex(), event.params.lpToken.toHex()]);
        return;
    }

    let symbol = getERC20Symbol(event.params.lpToken);
    if (symbol != "SLP"){
        logCritical('NewMarket not SLP but {}', [symbol]);
        return;
    }

    slpToken = new SLPToken(event.params.lpToken.toHex());
    slpToken.symbol = symbol;


    market = new Market(event.params.market.toHex());

    market.name = event.params.name;
    market.assetSymbol = event.params.assetSymbol;

    market.created = event.block.timestamp;
    market.createdAtBlock = event.block.number;
    market.createdAtTransaction = event.transaction.hash;


    // 1-1 relation
    market.token = slpToken.id;
    slpToken.market = market.id;
    market.save();
    slpToken.save();
    
    // IMPORTNAT: create dynamic source
    LPToken.create(event.params.lpToken);
    IrsMarket.create(event.params.market);
}

export function handlePositionOpened(event: PositionOpened): void {
    logInfo('DEBUG EVENT LOG: PositionOpened event for posIndex{}', [event.params.posIndex.toString()]);

    let market = Market.load(event.params.market.toHex()) as Market;
    if (market == null){
        logCritical('PositionOpened for null market={}', [event.params.market.toHex()]);
        return;
    }

    let account = ensureAccount(event.params.account);

    let pId = posId(market, account, event.params.posIndex);
    let position = Position.load(pId);
    if (position != null){
        logCritical('PositionOpened position already exist posIndex={}', [event.params.posIndex.toString()]);
        return;
    }

    position = new Position(pId);
    position.status = "Opened";
    position.market = market.id;
    position.account = account.id;
    position.posIndex = event.params.posIndex;

    position.positionType = "Long";
    if (event.params.isLong != true){
        position.positionType = "Short";
    }

    position.created = event.block.timestamp;

    //Main fin params
    position.notional = event.params.notional.toBigDecimal();
    position.collateral = event.params.collateral.toBigDecimal();
    position.leverage = event.params.leverage;
    position.openPrice = event.params.openPrice.toBigDecimal();

    position.save();
}

export function handlePositionClosed(event: PositionClosed): void {
    logInfo('DEBUG EVENT LOG: PositionClosed event for posIndex{}', [event.params.posIndex.toString()]);

    let market = Market.load(event.params.market.toHex()) as Market;
    if (market == null){
        logCritical('PositionClosed for null market={}', [event.params.market.toHex()]);
        return;
    }

    let account = ensureAccount(event.params.account);

    let pId = posId(market, account, event.params.posIndex);
    let position = Position.load(pId);
    if (position == null){
        logCritical('PositionClosed for null position posIndex={}', [event.params.posIndex.toString()]);
        return;
    }

    position.status = "Closed";
    position.closePrice = event.params.closePrice.toBigDecimal();

    position.save()
}

export function handlePositionLiquidated(event: PositionLiquidated): void {
    logInfo('DEBUG EVENT LOG: PositionLiquidated event for posIndex{}', [event.params.posIndex.toString()]);

    let market = Market.load(event.params.market.toHex()) as Market;
    if (market == null){
        logCritical('PositionLiquidated for null market={}', [event.params.market.toHex()]);
        return;
    }

    let account = ensureAccount(event.params.account);

    let pId = posId(market, account, event.params.posIndex);
    let position = Position.load(pId);
    if (position == null){
        logCritical('PositionLiquidated for null position posIndex={}', [event.params.posIndex.toString()]);
        return;
    }

    position.status = "Liquidated";
    position.closePrice = event.params.liquidationPrice.toBigDecimal();

    position.save()

}

export function handlePnlCalc(event: PnlCalcEvent): void {

}

export function handleOraclePriceUpdate(event: OraclePriceUpdatedEvent): void 
{
    logInfo('DEBUG EVENT LOG: OraclePriceUpdatedEvent event for market{}', [event.params.market.toHex()]);

    let market = Market.load(event.params.market.toHex()) as Market;
    if (market == null){
        logCritical('OraclePriceUpdatedEvent for null market {}', [event.params.market.toHex()]);
        return;
    }

    let marketPrice = ensureMarketPrice(market, event.params.marketPrice.toBigDecimal(), event);
    let oraclePrice = ensureOraclePrice(market, event.params.marketPrice.toBigDecimal(), event);

    market.marketPrice = marketPrice.id;
    market.oraclePrice = oraclePrice.id;

    market.save();
}

function posId(market:Market, account:Account, posIndex: BigInt): string {
    return market.id.toString() + account.id.toString() + posIndex.toString();
}


  