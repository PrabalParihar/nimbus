import WeatherXContract from 0xf8d6e0586b0a20c7

transaction(temperature: Fix64, humidity: Fix64) {
    let collectionRef: &WeatherXContract.WeatherDataCollection
    
    prepare(signer: AuthAccount) {
        // Get a reference to the signer's collection
        self.collectionRef = signer.borrow<&WeatherXContract.WeatherDataCollection>(from: /storage/WeatherDataCollection)
            ?? panic("Could not borrow reference to WeatherDataCollection")
    }
    
    execute {
        // Submit the weather data
        let id = self.collectionRef.submitWeatherData(temperature: temperature, humidity: humidity)
        log("Weather data submitted with ID: ".concat(id.toString()))
    }
} 