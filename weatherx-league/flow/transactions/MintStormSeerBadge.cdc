// MintStormSeerBadge.cdc - Transaction to mint a Storm Seer Badge
// This transaction will set up the recipient's collection if needed
// and mint a badge with specified XP (background hue will be randomized)

import StormSeer from 0x06
import NonFungibleToken from 0x1d7e57aa55817448
import MetadataViews from 0x1d7e57aa55817448

transaction(recipient: Address, xp: UInt64) {
    let minter: &StormSeer.Minter
    let recipientCollection: &StormSeer.Collection
    
    prepare(
        signer: auth(BorrowValue) &Account,
        recipientAccount: auth(SaveValue, IssueStorageCapabilityController, PublishCapability) &Account
    ) {
        // Get reference to the minter (must be called by contract deployer or authorized account)
        self.minter = signer.storage.borrow<&StormSeer.Minter>(from: StormSeer.MinterStoragePath)
            ?? panic("Could not borrow reference to the minter")
        
        // Check if recipient already has a collection
        if recipientAccount.storage.borrow<&StormSeer.Collection>(from: StormSeer.CollectionStoragePath) == nil {
            // Create and save a new collection for the recipient
            let collection <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
            recipientAccount.storage.save(<-collection, to: StormSeer.CollectionStoragePath)
            
            // Create and publish a capability for the collection
            let collectionCap = recipientAccount.capabilities.storage.issue<&StormSeer.Collection>(StormSeer.CollectionStoragePath)
            recipientAccount.capabilities.publish(collectionCap, at: StormSeer.CollectionPublicPath)
        }
        
        // Get reference to the recipient's collection
        self.recipientCollection = recipientAccount.storage.borrow<&StormSeer.Collection>(from: StormSeer.CollectionStoragePath)
            ?? panic("Could not borrow reference to the recipient's collection")
    }
    
    execute {
        // Mint the badge with randomized background hue
        let badge <- self.minter.mintBadge(recipient: recipient, xp: xp)
        
        // Deposit the badge into the recipient's collection
        self.recipientCollection.deposit(token: <-badge)
        
        log("Successfully minted Storm Seer Badge for account ".concat(recipient.toString()).concat(" with ").concat(xp.toString()).concat(" XP"))
    }
    
    post {
        // Verify the badge was successfully minted and deposited
        self.recipientCollection.getLength() > 0: "Badge was not successfully deposited"
    }
} 