pub contract WeatherXContract {
    
    // Events
    pub event WeatherDataSubmitted(id: UInt64, temperature: Fix64, humidity: Fix64, timestamp: UFix64)
    pub event ContractInitialized()
    
    // Resources
    pub resource WeatherData {
        pub let id: UInt64
        pub let temperature: Fix64
        pub let humidity: Fix64
        pub let timestamp: UFix64
        pub let submitter: Address
        
        init(id: UInt64, temperature: Fix64, humidity: Fix64, submitter: Address) {
            self.id = id
            self.temperature = temperature
            self.humidity = humidity
            self.timestamp = getCurrentBlock().timestamp
            self.submitter = submitter
        }
    }
    
    // Public interface for weather data collection
    pub resource interface WeatherDataCollectionPublic {
        pub fun getWeatherData(id: UInt64): &WeatherData?
        pub fun getWeatherDataIDs(): [UInt64]
    }
    
    // Collection resource to store weather data
    pub resource WeatherDataCollection: WeatherDataCollectionPublic {
        pub var weatherData: @{UInt64: WeatherData}
        
        init() {
            self.weatherData <- {}
        }
        
        pub fun submitWeatherData(temperature: Fix64, humidity: Fix64): UInt64 {
            let newData <- create WeatherData(
                id: WeatherXContract.totalSupply,
                temperature: temperature,
                humidity: humidity,
                submitter: self.owner?.address!
            )
            
            let id = newData.id
            self.weatherData[id] <-! newData
            
            WeatherXContract.totalSupply = WeatherXContract.totalSupply + 1
            
            emit WeatherDataSubmitted(
                id: id,
                temperature: temperature,
                humidity: humidity,
                timestamp: getCurrentBlock().timestamp
            )
            
            return id
        }
        
        pub fun getWeatherData(id: UInt64): &WeatherData? {
            return &self.weatherData[id] as &WeatherData?
        }
        
        pub fun getWeatherDataIDs(): [UInt64] {
            return self.weatherData.keys
        }
        
        destroy() {
            destroy self.weatherData
        }
    }
    
    // Contract state
    pub var totalSupply: UInt64
    
    // Public functions
    pub fun createWeatherDataCollection(): @WeatherDataCollection {
        return <- create WeatherDataCollection()
    }
    
    pub fun getWeatherDataCount(): UInt64 {
        return self.totalSupply
    }
    
    init() {
        self.totalSupply = 0
        
        // Create a collection for the contract account
        self.account.save(<-create WeatherDataCollection(), to: /storage/WeatherDataCollection)
        
        // Create a public capability for the collection
        self.account.link<&WeatherDataCollection{WeatherDataCollectionPublic}>(
            /public/WeatherDataCollection,
            target: /storage/WeatherDataCollection
        )
        
        emit ContractInitialized()
    }
} 