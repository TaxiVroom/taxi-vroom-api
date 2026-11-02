#E from>rel>to
priceEstimate>partOf>product
priceEstimate>implements>#N:TaxiFare
priceEstimate>uses>#N:RideEntity
rideLifecycle>implements>#N:RideEntity
rideLifecycle>partOf>product
rideLifecycle>dependsOn>realtime
rideLifecycle>dependsOn>platform
priceEstimate>relatedTo>rideLifecycle
realtime>implements>#N:RideRealtime
realtime>implements>#N:DriverLocator
registration>partOf>product
registration>dependsOn>platform
registration>implements>#N:RegistrationModule
platform>implements>#N:AuthGuards
