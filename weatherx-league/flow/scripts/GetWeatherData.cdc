import WeatherXContract from 0xf8d6e0586b0a20c7

pub fun main(address: Address): [UInt64] {
    // Get a reference to the public collection
    let publicCollection = getAccount(address)
        .getCapability(/public/WeatherDataCollection)
        .borrow<&WeatherXContract.WeatherDataCollection{WeatherXContract.WeatherDataCollectionPublic}>()
        ?? panic("Could not borrow reference to public WeatherDataCollection")
    
    // Get all weather data IDs
    let weatherDataIDs = publicCollection.getWeatherDataIDs()
    
    log("Found ".concat(weatherDataIDs.length.toString()).concat(" weather data entries"))
    
    return weatherDataIDs
} 