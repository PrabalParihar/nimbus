// StormSeer.cdc - Weather Prediction NFT Badges
// Implements Flow NFT Standard with randomized background hue
// Uses native VRF via getRandom() for true randomness

import NonFungibleToken from 0x1d7e57aa55817448
import MetadataViews from 0x1d7e57aa55817448

access(all) contract StormSeer: NonFungibleToken {
    
    // Events
    access(all) event ContractInitialized()
    access(all) event Withdraw(id: UInt64, from: Address?)
    access(all) event Deposit(id: UInt64, to: Address?)
    access(all) event BadgeMinted(id: UInt64, recipient: Address, xp: UInt64, bgHue: UInt64)
    access(all) event BadgeDestroyed(id: UInt64)
    
    // Named Paths
    access(all) let CollectionStoragePath: StoragePath
    access(all) let CollectionPublicPath: PublicPath
    access(all) let MinterStoragePath: StoragePath
    access(all) let MinterPublicPath: PublicPath
    
    // Contract state
    access(all) var totalSupply: UInt64
    access(account) var badgeCounter: UInt64
    
    // Badge rarity tiers based on XP
    access(all) enum BadgeRarity: UInt8 {
        access(all) case Bronze    // 0-99 XP
        access(all) case Silver    // 100-499 XP  
        access(all) case Gold      // 500-999 XP
        access(all) case Platinum  // 1000+ XP
    }
    
    // NFT Resource that represents a Storm Seer Badge
    access(all) resource NFT: NonFungibleToken.NFT {
        access(all) let id: UInt64
        access(all) let xp: UInt64
        access(all) let bgHue: UInt64  // Background hue (0-359)
        access(all) let rarity: BadgeRarity
        access(all) let mintTimestamp: UFix64
        access(all) let metadata: {String: String}
        
        init(id: UInt64, xp: UInt64, bgHue: UInt64, recipient: Address) {
            self.id = id
            self.xp = xp
            self.bgHue = bgHue
            self.mintTimestamp = getCurrentBlock().timestamp
            
            // Determine rarity based on XP
            if xp >= 1000 {
                self.rarity = BadgeRarity.Platinum
            } else if xp >= 500 {
                self.rarity = BadgeRarity.Gold
            } else if xp >= 100 {
                self.rarity = BadgeRarity.Silver
            } else {
                self.rarity = BadgeRarity.Bronze
            }
            
            // Build metadata
            self.metadata = {
                "name": "Storm Seer Badge #".concat(id.toString()),
                "description": "A weather prediction badge earned through accurate forecasting",
                "image": "https://stormseer.app/badge/".concat(id.toString()).concat(".png"),
                "xp": xp.toString(),
                "bgHue": bgHue.toString(),
                "rarity": self.rarity.rawValue.toString(),
                "mintTimestamp": self.mintTimestamp.toString(),
                "recipient": recipient.toString(),
                "external_url": "https://stormseer.app/badge/".concat(id.toString())
            }
        }
        
        // Implement required NFT interface methods
        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
        }
        
        access(all) view fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>(),
                Type<MetadataViews.Royalties>(),
                Type<MetadataViews.ExternalURL>(),
                Type<MetadataViews.NFTCollectionData>(),
                Type<MetadataViews.NFTCollectionDisplay>(),
                Type<MetadataViews.Serial>(),
                Type<MetadataViews.Traits>()
            ]
        }
        
        access(all) fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.metadata["name"] ?? "Storm Seer Badge",
                        description: self.metadata["description"] ?? "Weather prediction badge",
                        thumbnail: MetadataViews.HTTPFile(
                            url: self.metadata["image"] ?? ""
                        )
                    )
                case Type<MetadataViews.Serial>():
                    return MetadataViews.Serial(
                        self.id
                    )
                case Type<MetadataViews.Traits>():
                    let traits: [MetadataViews.Trait] = []
                    traits.append(MetadataViews.Trait(
                        name: "XP",
                        value: self.xp,
                        displayType: "Number",
                        rarity: nil
                    ))
                    traits.append(MetadataViews.Trait(
                        name: "Background Hue",
                        value: self.bgHue,
                        displayType: "Number",
                        rarity: nil
                    ))
                    traits.append(MetadataViews.Trait(
                        name: "Rarity",
                        value: self.rarity.rawValue,
                        displayType: "String",
                        rarity: nil
                    ))
                    return MetadataViews.Traits(traits)
                    
                case Type<MetadataViews.ExternalURL>():
                    return MetadataViews.ExternalURL(self.metadata["external_url"] ?? "")
                    
                case Type<MetadataViews.NFTCollectionData>():
                    return MetadataViews.NFTCollectionData(
                        storagePath: StormSeer.CollectionStoragePath,
                        publicPath: StormSeer.CollectionPublicPath,
                        publicCollection: Type<&StormSeer.Collection>(),
                        publicLinkedType: Type<&StormSeer.Collection>(),
                        createEmptyCollectionFunction: (fun (): @{NonFungibleToken.Collection} {
                            return <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
                        })
                    )
                    
                case Type<MetadataViews.NFTCollectionDisplay>():
                    let squareImage = MetadataViews.Media(
                        file: MetadataViews.HTTPFile(
                            url: "https://stormseer.app/logo-square.png"
                        ),
                        mediaType: "image/png"
                    )
                    let bannerImage = MetadataViews.Media(
                        file: MetadataViews.HTTPFile(
                            url: "https://stormseer.app/banner.png"
                        ),
                        mediaType: "image/png"
                    )
                    return MetadataViews.NFTCollectionDisplay(
                        name: "Storm Seer Badges",
                        description: "NFT badges earned through accurate weather predictions",
                        externalURL: MetadataViews.ExternalURL("https://stormseer.app"),
                        squareImage: squareImage,
                        bannerImage: bannerImage,
                        socials: {
                            "twitter": MetadataViews.ExternalURL("https://twitter.com/stormseer")
                        }
                    )
            }
            return nil
        }
        
        destroy() {
            emit BadgeDestroyed(id: self.id)
        }
    }
    
    // Collection Resource for storing NFTs
    access(all) resource Collection: NonFungibleToken.Collection {
        access(all) var ownedNFTs: @{UInt64: {NonFungibleToken.NFT}}
        
        init() {
            self.ownedNFTs <- {}
        }
        
        // Required Collection interface methods
        access(all) view fun getLength(): Int {
            return self.ownedNFTs.length
        }
        
        access(all) view fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }
        
        access(all) fun deposit(token: @{NonFungibleToken.NFT}) {
            let token <- token as! @StormSeer.NFT
            let id: UInt64 = token.id
            
            // Add the new token to the dictionary
            let oldToken <- self.ownedNFTs[id] <- token
            
            // Emit deposit event
            emit Deposit(id: id, to: self.owner?.address)
            
            // Destroy the old token if it existed
            destroy oldToken
        }
        
        access(NonFungibleToken.Withdraw) fun withdraw(withdrawID: UInt64): @{NonFungibleToken.NFT} {
            let token <- self.ownedNFTs.remove(key: withdrawID) 
                ?? panic("Could not withdraw an NFT with the provided ID from the collection")
            
            emit Withdraw(id: token.id, from: self.owner?.address)
            return <- token
        }
        
        access(all) view fun borrowNFT(_ id: UInt64): &{NonFungibleToken.NFT}? {
            return &self.ownedNFTs[id] as &{NonFungibleToken.NFT}?
        }
        
        access(all) fun borrowStormSeerNFT(id: UInt64): &StormSeer.NFT? {
            if self.ownedNFTs[id] != nil {
                let ref = &self.ownedNFTs[id] as &{NonFungibleToken.NFT}?
                return ref as! &StormSeer.NFT?
            }
            return nil
        }
        
        access(all) view fun getSupportedNFTTypes(): {Type: Bool} {
            let supportedTypes: {Type: Bool} = {}
            supportedTypes[Type<@StormSeer.NFT>()] = true
            return supportedTypes
        }
        
        access(all) view fun isSupportedNFTType(type: Type): Bool {
            return type == Type<@StormSeer.NFT>()
        }
        
        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            return <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
        }
        
        destroy() {
            destroy self.ownedNFTs
        }
    }
    
    // Minter Resource for creating new NFTs
    access(all) resource Minter {
        
        // Mint a new Storm Seer Badge with randomized background hue
        access(all) fun mintBadge(recipient: Address, xp: UInt64): @StormSeer.NFT {
            // Generate random background hue using native VRF
            let hue: UInt64 = getRandom() % 360
            
            // Create the NFT with randomized background
            let badge <- create NFT(
                id: StormSeer.badgeCounter,
                xp: xp,
                bgHue: hue,
                recipient: recipient
            )
            
            // Increment counters
            StormSeer.badgeCounter = StormSeer.badgeCounter + 1
            StormSeer.totalSupply = StormSeer.totalSupply + 1
            
            // Emit minting event
            emit BadgeMinted(
                id: badge.id,
                recipient: recipient,
                xp: xp,
                bgHue: hue
            )
            
            return <- badge
        }
        
        // Batch mint multiple badges (for admin operations)
        access(all) fun batchMintBadges(recipients: [Address], xpAmounts: [UInt64]): @[StormSeer.NFT] {
            pre {
                recipients.length == xpAmounts.length: "Recipients and XP amounts must have the same length"
            }
            
            let badges: @[StormSeer.NFT] <- []
            var i = 0
            
            while i < recipients.length {
                let badge <- self.mintBadge(recipient: recipients[i], xp: xpAmounts[i])
                badges.append(<- badge)
                i = i + 1
            }
            
            return <- badges
        }
        
        // Get badge statistics
        access(all) view fun getBadgeStats(): {String: UInt64} {
            return {
                "totalSupply": StormSeer.totalSupply,
                "badgeCounter": StormSeer.badgeCounter
            }
        }
    }
    
    // Public interface for Collection
    access(all) resource interface StormSeerCollectionPublic {
        access(all) fun getIDs(): [UInt64]
        access(all) fun borrowNFT(_ id: UInt64): &{NonFungibleToken.NFT}?
        access(all) fun borrowStormSeerNFT(id: UInt64): &StormSeer.NFT?
        access(all) fun deposit(token: @{NonFungibleToken.NFT})
        access(all) view fun getLength(): Int
    }
    
    // Create an empty Collection
    access(all) fun createEmptyCollection(nftType: Type): @{NonFungibleToken.Collection} {
        return <- create Collection()
    }
    
    // Get contract information
    access(all) view fun getContractViews(resourceType: Type?): [Type] {
        return [
            Type<MetadataViews.NFTCollectionData>(),
            Type<MetadataViews.NFTCollectionDisplay>()
        ]
    }
    
    access(all) fun resolveContractView(resourceType: Type?, viewType: Type): AnyStruct? {
        switch viewType {
            case Type<MetadataViews.NFTCollectionData>():
                return MetadataViews.NFTCollectionData(
                    storagePath: StormSeer.CollectionStoragePath,
                    publicPath: StormSeer.CollectionPublicPath,
                    publicCollection: Type<&StormSeer.Collection>(),
                    publicLinkedType: Type<&StormSeer.Collection>(),
                    createEmptyCollectionFunction: (fun (): @{NonFungibleToken.Collection} {
                        return <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
                    })
                )
            case Type<MetadataViews.NFTCollectionDisplay>():
                let squareImage = MetadataViews.Media(
                    file: MetadataViews.HTTPFile(
                        url: "https://stormseer.app/logo-square.png"
                    ),
                    mediaType: "image/png"
                )
                let bannerImage = MetadataViews.Media(
                    file: MetadataViews.HTTPFile(
                        url: "https://stormseer.app/banner.png"
                    ),
                    mediaType: "image/png"
                )
                return MetadataViews.NFTCollectionDisplay(
                    name: "Storm Seer Badges",
                    description: "NFT badges earned through accurate weather predictions",
                    externalURL: MetadataViews.ExternalURL("https://stormseer.app"),
                    squareImage: squareImage,
                    bannerImage: bannerImage,
                    socials: {
                        "twitter": MetadataViews.ExternalURL("https://twitter.com/stormseer")
                    }
                )
        }
        return nil
    }
    
    // Utility functions
    access(all) view fun getTotalSupply(): UInt64 {
        return self.totalSupply
    }
    
    access(all) view fun getBadgeCounter(): UInt64 {
        return self.badgeCounter
    }
    
    // Check if an account has a Storm Seer collection
    access(all) fun checkCollection(_ address: Address): Bool {
        return getAccount(address)
            .capabilities
            .get<&StormSeer.Collection>(StormSeer.CollectionPublicPath)
            .check()
    }
    
    // Get all badge IDs owned by an address
    access(all) fun getBadgeIDs(_ address: Address): [UInt64] {
        let collection = getAccount(address)
            .capabilities
            .get<&StormSeer.Collection>(StormSeer.CollectionPublicPath)
            .borrow()
            
        return collection?.getIDs() ?? []
    }
    
    // Get badge details by ID from an address
    access(all) fun getBadgeDetails(_ address: Address, _ id: UInt64): {String: String}? {
        let collection = getAccount(address)
            .capabilities
            .get<&StormSeer.Collection>(StormSeer.CollectionPublicPath)
            .borrow()
            
        if let badge = collection?.borrowStormSeerNFT(id: id) {
            return badge.metadata
        }
        
        return nil
    }
    
    init() {
        // Initialize contract state
        self.totalSupply = 0
        self.badgeCounter = 0
        
        // Set named paths
        self.CollectionStoragePath = /storage/StormSeerCollection
        self.CollectionPublicPath = /public/StormSeerCollection
        self.MinterStoragePath = /storage/StormSeerMinter
        self.MinterPublicPath = /public/StormSeerMinter
        
        // Create and store a Minter resource in the deployer's account
        let minter <- create Minter()
        self.account.storage.save(<-minter, to: self.MinterStoragePath)
        
        // Create and publish a capability for the Minter
        let minterCap = self.account.capabilities.storage.issue<&Minter>(self.MinterStoragePath)
        self.account.capabilities.publish(minterCap, at: self.MinterPublicPath)
        
        // Create and store a Collection in the deployer's account
        let collection <- create Collection()
        self.account.storage.save(<-collection, to: self.CollectionStoragePath)
        
        // Create and publish a capability for the Collection
        let collectionCap = self.account.capabilities.storage.issue<&Collection>(self.CollectionStoragePath)
        self.account.capabilities.publish(collectionCap, at: self.CollectionPublicPath)
        
        emit ContractInitialized()
    }
} 