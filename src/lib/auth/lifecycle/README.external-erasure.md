# External account erasure sequencing

The account-deletion transaction must not perform provider network requests.

The current provider-neutral erasure contract intentionally remains disconnected from the live deletion route until CITYWALK has durable retry state for provider erasure. A local-first flow without retry state can leave provider data behind after a transient provider failure; a provider-first flow can erase provider data and then fail the local deletion because retention eligibility changed.

The next integration step is therefore a durable deletion/erasure job or outbox that can be retried independently of the user row. RevenueCat-specific HTTP credentials and requests remain server-only and are not part of this foundation.
