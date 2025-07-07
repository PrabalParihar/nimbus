// GetStormSeerBadges.cdc - Script to get Storm Seer Badge details
// Returns badge information including randomized background hue

import StormSeer from 0x06
import NonFungibleToken from 0x1d7e57aa55817448
import MetadataViews from 0x1d7e57aa55817448

// Structure to return badge information
access(all) struct BadgeInfo {
    access(all) let id: UInt64
    access(all) let xp: UInt64
    access(all) let bgHue: UInt64
    access(all) let rarity: String
    access(all) let mintTimestamp: UFix64
    access(all) let metadata: {String: String}
    
    init(id: UInt64, xp: UInt64, bgHue: UInt64, rarity: String, mintTimestamp: UFix64, metadata: {String: String}) {
        self.id = id
        self.xp = xp
        self.bgHue = bgHue
        self.rarity = rarity
        self.mintTimestamp = mintTimestamp
        self.metadata = metadata
    }
}

// Main function to get all badges for an address
access(all) fun main(address: Address): [BadgeInfo] {
    let account = getAccount(address)
    let badges: [BadgeInfo] = []
    
    // Get reference to the collection
    if let collection = account.capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).borrow() {
        let badgeIDs = collection.getIDs()
        
        for badgeID in badgeIDs {
            if let badge = collection.borrowStormSeerNFT(id: badgeID) {
                let badgeInfo = BadgeInfo(
                    id: badge.id,
                    xp: badge.xp,
                    bgHue: badge.bgHue,
                    rarity: badge.rarity.rawValue.toString(),
                    mintTimestamp: badge.mintTimestamp,
                    metadata: badge.metadata
                )
                badges.append(badgeInfo)
            }
        }
    }
    
    return badges
}

// Function to get a specific badge by ID
access(all) fun getBadgeByID(address: Address, badgeID: UInt64): BadgeInfo? {
    let account = getAccount(address)
    
    if let collection = account.capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).borrow() {
        if let badge = collection.borrowStormSeerNFT(id: badgeID) {
            return BadgeInfo(
                id: badge.id,
                xp: badge.xp,
                bgHue: badge.bgHue,
                rarity: badge.rarity.rawValue.toString(),
                mintTimestamp: badge.mintTimestamp,
                metadata: badge.metadata
            )
        }
    }
    
    return nil
}

// Function to get badge count for an address
access(all) fun getBadgeCount(address: Address): Int {
    let account = getAccount(address)
    
    if let collection = account.capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).borrow() {
        return collection.getLength()
    }
    
    return 0
}

// Function to check if address has a specific rarity badge
access(all) fun hasRarityBadge(address: Address, rarity: UInt8): Bool {
    let account = getAccount(address)
    
    if let collection = account.capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).borrow() {
        let badgeIDs = collection.getIDs()
        
        for badgeID in badgeIDs {
            if let badge = collection.borrowStormSeerNFT(id: badgeID) {
                if badge.rarity.rawValue == rarity {
                    return true
                }
            }
        }
    }
    
    return false
}

// Function to get contract stats
access(all) fun getContractStats(): {String: UInt64} {
    return {
        "totalSupply": StormSeer.getTotalSupply(),
        "badgeCounter": StormSeer.getBadgeCounter()
    }
} 