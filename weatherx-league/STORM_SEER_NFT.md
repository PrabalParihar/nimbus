# Storm Seer NFT Contract

## Overview

The Storm Seer NFT contract implements the [Flow NFT Standard](https://cadence-lang.org/docs/tutorial/non-fungible-tokens-1?utm_source=chatgpt.com) to create weather prediction badges with randomized background hues using [Flow's native randomness API](https://developers.flow.com/build/advanced-concepts/randomness?utm_source=chatgpt.com).

## Key Features

### 🎲 **Native VRF Randomness**
- Uses `getRandom() % 360` for truly random background hue generation
- Each badge has a unique color based on cryptographically secure randomness
- Hue values range from 0-359 for full color spectrum coverage

### 🏆 **XP-Based Rarity System**
- **Bronze**: 0-99 XP
- **Silver**: 100-499 XP  
- **Gold**: 500-999 XP
- **Platinum**: 1000+ XP

### 📊 **Rich Metadata**
- On-chain metadata storage (no IPFS dependencies)
- Comprehensive badge information including XP, hue, rarity, timestamp
- MetadataViews support for wallet and marketplace compatibility

### 🔒 **Production-Ready Security**
- Implements full Flow NFT Standard interface
- Proper access controls and entitlements
- Resource-oriented programming for true ownership

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          StormSeer Contract                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │      NFT        │  │   Collection    │  │     Minter      │ │
│  │   Resource      │  │   Resource      │  │   Resource      │ │
│  │                 │  │                 │  │                 │ │
│  │ • id: UInt64    │  │ • ownedNFTs     │  │ • mintBadge()   │ │
│  │ • xp: UInt64    │  │ • deposit()     │  │ • batchMint()   │ │
│  │ • bgHue: UInt64 │  │ • withdraw()    │  │ • getStats()    │ │
│  │ • rarity: Enum  │  │ • getIDs()      │  │                 │ │
│  │ • metadata: {}  │  │ • borrowNFT()   │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                   Native VRF Integration                    │
│  │                                                             │
│  │   let hue: UInt64 = getRandom() % 360                      │
│  │   create NFT(bgHue: hue)                                   │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
```

## Usage Examples

### 1. **Deploy Contract**
```cadence
// Deploy StormSeer.cdc to Flow network
// Contract automatically initializes with minter and collection
```

### 2. **Set Up User Collection**
```cadence
// Run SetupStormSeerCollection.cdc transaction
import StormSeer from 0x06

transaction() {
    prepare(signer: auth(SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        let collection <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
        signer.storage.save(<-collection, to: StormSeer.CollectionStoragePath)
        
        let collectionCap = signer.capabilities.storage.issue<&StormSeer.Collection>(StormSeer.CollectionStoragePath)
        signer.capabilities.publish(collectionCap, at: StormSeer.CollectionPublicPath)
    }
}
```

### 3. **Mint Badge (Backend After Payout)**
```cadence
// Run MintStormSeerBadge.cdc transaction
import StormSeer from 0x06

transaction(recipient: Address, xp: UInt64) {
    prepare(signer: auth(BorrowValue) &Account) {
        let minter = signer.storage.borrow<&StormSeer.Minter>(from: StormSeer.MinterStoragePath)
            ?? panic("Could not borrow reference to the minter")
        
        // Mint with randomized background hue
        let badge <- minter.mintBadge(recipient: recipient, xp: xp)
        
        // Deposit into recipient's collection
        // ... collection setup and deposit logic
    }
}
```

### 4. **View Badge Details**
```cadence
// Run GetStormSeerBadges.cdc script
import StormSeer from 0x06

access(all) fun main(address: Address): [BadgeInfo] {
    let account = getAccount(address)
    let badges: [BadgeInfo] = []
    
    if let collection = account.capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).borrow() {
        let badgeIDs = collection.getIDs()
        
        for badgeID in badgeIDs {
            if let badge = collection.borrowStormSeerNFT(id: badgeID) {
                // Badge contains: id, xp, bgHue, rarity, mintTimestamp, metadata
                badges.append(BadgeInfo(
                    id: badge.id,
                    xp: badge.xp,
                    bgHue: badge.bgHue,  // Random hue 0-359
                    rarity: badge.rarity.rawValue.toString(),
                    mintTimestamp: badge.mintTimestamp,
                    metadata: badge.metadata
                ))
            }
        }
    }
    
    return badges
}
```

## API Reference

### **Contract Functions**

#### `mintBadge(recipient: Address, xp: UInt64): @StormSeer.NFT`
- **Access**: Minter resource only
- **Purpose**: Creates a new badge with randomized background hue
- **Parameters**:
  - `recipient`: Address of the badge recipient
  - `xp`: Experience points (determines rarity)
- **Returns**: NFT resource with unique ID and random hue

#### `getTotalSupply(): UInt64`
- **Access**: Public view
- **Purpose**: Returns total number of badges minted
- **Returns**: Current total supply

#### `getBadgeIDs(address: Address): [UInt64]`
- **Access**: Public view
- **Purpose**: Gets all badge IDs owned by an address
- **Returns**: Array of badge IDs

#### `getBadgeDetails(address: Address, id: UInt64): {String: String}?`
- **Access**: Public view
- **Purpose**: Gets metadata for a specific badge
- **Returns**: Badge metadata dictionary

### **NFT Properties**

```cadence
access(all) resource NFT {
    access(all) let id: UInt64              // Unique badge ID
    access(all) let xp: UInt64              // Experience points
    access(all) let bgHue: UInt64           // Random background hue (0-359)
    access(all) let rarity: BadgeRarity     // Bronze/Silver/Gold/Platinum
    access(all) let mintTimestamp: UFix64   // Block timestamp
    access(all) let metadata: {String: String}  // Rich metadata
}
```

### **Events**

```cadence
access(all) event BadgeMinted(id: UInt64, recipient: Address, xp: UInt64, bgHue: UInt64)
access(all) event Deposit(id: UInt64, to: Address?)
access(all) event Withdraw(id: UInt64, from: Address?)
access(all) event BadgeDestroyed(id: UInt64)
```

## Integration with Backend

### **After Payout Flow**
1. **User completes weather prediction**
2. **Backend calculates XP reward**
3. **Backend calls `mintBadge(recipient, xp)`**
4. **Random hue generated via `getRandom() % 360`**
5. **Badge minted and deposited to user's collection**
6. **Frontend displays badge with unique color**

### **Access Control**
- Only contract deployer or authorized minters can mint badges
- Users can transfer badges freely (standard NFT behavior)
- Backend needs minter capability to mint after payouts

## Randomness Implementation

The contract uses Flow's native VRF (Verifiable Random Function) for truly random background hues:

```cadence
// In mintBadge function
let hue: UInt64 = getRandom() % 360

// Creates NFT with random background color
let badge <- create NFT(
    id: StormSeer.badgeCounter,
    xp: xp,
    bgHue: hue,  // Random value 0-359
    recipient: recipient
)
```

### **Benefits of Native VRF**
- **Cryptographically secure**: Cannot be manipulated by miners or users
- **Gas efficient**: No external oracle calls required
- **Instant**: Random value available immediately
- **Transparent**: Verifiable on-chain randomness

## File Structure

```
flow/
├── contracts/
│   └── StormSeer.cdc                    # Main NFT contract
├── transactions/
│   ├── SetupStormSeerCollection.cdc     # User collection setup
│   └── MintStormSeerBadge.cdc          # Badge minting (backend)
└── scripts/
    └── GetStormSeerBadges.cdc          # View badge details
```

## Testing

### **Flow Playground**
1. Deploy `StormSeer.cdc` to account `0x06`
2. Run `SetupStormSeerCollection.cdc` for user account
3. Run `MintStormSeerBadge.cdc` with test XP values
4. Execute `GetStormSeerBadges.cdc` to view results

### **Example Test Data**
```cadence
// Test minting different rarity badges
mintBadge(recipient: 0x07, xp: 50)    // Bronze badge
mintBadge(recipient: 0x07, xp: 250)   // Silver badge
mintBadge(recipient: 0x07, xp: 750)   // Gold badge
mintBadge(recipient: 0x07, xp: 1500)  // Platinum badge
```

## Production Deployment

### **Mainnet Deployment**
1. Deploy contract to Flow Mainnet
2. Configure backend with contract address
3. Set up minter capabilities for backend services
4. Implement frontend badge display with hue-based coloring

### **Environment Variables**
```bash
# Flow network configuration
FLOW_NETWORK=mainnet
FLOW_CONTRACT_ADDRESS=0x...
FLOW_MINTER_PRIVATE_KEY=...
```

### **Security Considerations**
- **Private key management**: Secure storage for minter keys
- **Rate limiting**: Prevent spam minting
- **XP validation**: Verify XP amounts before minting
- **Access control**: Restrict minting to authorized backends

## MetadataViews Support

The contract implements full MetadataViews support for wallet and marketplace compatibility:

```cadence
// Supported metadata views
Type<MetadataViews.Display>()           // Name, description, image
Type<MetadataViews.Serial>()            // Unique serial number
Type<MetadataViews.Traits>()            // XP, hue, rarity traits
Type<MetadataViews.ExternalURL>()       // Badge detail page
Type<MetadataViews.NFTCollectionData>() // Collection info
Type<MetadataViews.NFTCollectionDisplay>() // Collection display
```

## Future Enhancements

### **Planned Features**
- **Badge burning**: Exchange badges for rewards
- **Badge combining**: Merge lower tier badges into higher tiers
- **Seasonal badges**: Limited-time badge variants
- **Achievement system**: Special badges for milestones

### **Visual Enhancements**
- **HSL color rendering**: Use hue value for dynamic colors
- **Gradient backgrounds**: Multi-color gradients based on hue
- **Animation effects**: Shimmer effects for higher rarities
- **3D rendering**: Enhanced visual presentation

## Support & Resources

- **Flow Documentation**: [Flow Developer Portal](https://developers.flow.com)
- **Cadence Language**: [Cadence Documentation](https://cadence-lang.org)
- **NFT Standard**: [Flow NFT Standard](https://github.com/onflow/flow-nft)
- **Randomness API**: [Flow Randomness Guide](https://developers.flow.com/build/advanced-concepts/randomness)

## License

This contract is part of the WeatherX League project and follows the same MIT license terms. 