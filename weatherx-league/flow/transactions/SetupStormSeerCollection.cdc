// SetupStormSeerCollection.cdc - Transaction to set up Storm Seer Collection
// This transaction sets up a user's account to hold Storm Seer Badges

import StormSeer from 0x06
import NonFungibleToken from 0x1d7e57aa55817448
import MetadataViews from 0x1d7e57aa55817448

transaction() {
    prepare(signer: auth(SaveValue, IssueStorageCapabilityController, PublishCapability) &Account) {
        // Check if the account already has a collection
        if signer.storage.borrow<&StormSeer.Collection>(from: StormSeer.CollectionStoragePath) != nil {
            log("Collection already exists for this account")
            return
        }
        
        // Create and save a new collection
        let collection <- StormSeer.createEmptyCollection(nftType: Type<@StormSeer.NFT>())
        signer.storage.save(<-collection, to: StormSeer.CollectionStoragePath)
        
        // Create and publish a capability for the collection
        let collectionCap = signer.capabilities.storage.issue<&StormSeer.Collection>(StormSeer.CollectionStoragePath)
        signer.capabilities.publish(collectionCap, at: StormSeer.CollectionPublicPath)
        
        log("Successfully set up Storm Seer Collection for account ".concat(signer.address.toString()))
    }
    
    post {
        // Verify the collection was set up correctly
        getAccount(self.signer.address).capabilities.get<&StormSeer.Collection>(StormSeer.CollectionPublicPath).check():
            "Collection was not set up correctly"
    }
} 