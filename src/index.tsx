// import GraphQLClient from "apollo-boost"
import React, { useLayoutEffect, useState, FC } from 'react'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { onError } from 'apollo-link-error'
import { ApolloLink } from 'apollo-link'
import { ApolloProvider } from 'react-apollo'
import { Arg1 } from 'tsargs'

export const createClient = ({
    LOCAL_STORAGE_JWT_TOKEN_KEY,
    GRAPHQL_PRODUCTION_ENDPOINT,
    GRAPHQL_TESTING_ENDPOINT,
    GRAPHQL_MOCKING_ENDPOINT,
    AUTHORIZATION_HEADER = 'Authorization',
    AUTHORIZATION_SCHEME = 'Bearer',
    mocking = false,
    alertOnError = true,
    disableCaching = true
}) => {
    const uri = mocking
        ? GRAPHQL_MOCKING_ENDPOINT
        : process.env.NODE_ENV === 'production'
        ? GRAPHQL_PRODUCTION_ENDPOINT
        : GRAPHQL_TESTING_ENDPOINT

    const httpLink = new HttpLink({ uri })

    const authLink = new ApolloLink((operation, forward) => {
        // Retrieve the authorization token from local storage.
        const token = localStorage.getItem(LOCAL_STORAGE_JWT_TOKEN_KEY)
        if (token && process.env.NODE_ENV !== 'production') {
            console.log('using jwt token ' + token + ' for graphql client')
        }
        // Use the setContext method to set the HTTP headers.
        let headers = {}

        if (token) {
            headers[AUTHORIZATION_HEADER] = `${AUTHORIZATION_SCHEME} ${token}`
        }

        operation.setContext({
            headers
        })

        // Call the next link in the middleware chain.
        return forward(operation)
    })

    const errorAlerter = onError((error) => {
        const errors = error!.graphQLErrors!.map(({ message }) => message)
        const err = 'graphql error:\n' + JSON.stringify(errors, null, '    ')
        if (alertOnError) {
            alert(err)
        } else {
            console.error(err)
        }
    })

    let options = {
        link: ApolloLink.from([authLink, errorAlerter, httpLink]), // Chain it with the HttpLink
        cache: new InMemoryCache()
    }

    if (disableCaching) {
        options['defaultOptions'] = {
            watchQuery: {
                fetchPolicy: 'no-cache',
                errorPolicy: 'ignore'
            },
            query: {
                fetchPolicy: 'no-cache',
                errorPolicy: 'all'
            }
        }
    }
    return new ApolloClient(options)
}

export const GraphqlProvider = ({
    children,
    LOCAL_STORAGE_JWT_TOKEN_KEY,
    GRAPHQL_PRODUCTION_ENDPOINT,
    GRAPHQL_TESTING_ENDPOINT,
    GRAPHQL_MOCKING_ENDPOINT,
    AUTHORIZATION_HEADER = 'Authorization',
    AUTHORIZATION_SCHEME = 'Bearer',
    mocking = false,
    alertOnError = true,
    disableCaching = true
}) => {
    const [client, setClient] = useState(
        (undefined as unknown) as ApolloClient<any>
    )
    useLayoutEffect(() => {
        setClient(
            createClient({
                LOCAL_STORAGE_JWT_TOKEN_KEY,
                GRAPHQL_PRODUCTION_ENDPOINT,
                GRAPHQL_TESTING_ENDPOINT,
                GRAPHQL_MOCKING_ENDPOINT,
                AUTHORIZATION_HEADER,
                AUTHORIZATION_SCHEME,
                mocking,
                alertOnError,
                disableCaching
            })
        )
    }, [])
    return <ApolloProvider client={client}>{children}</ApolloProvider>
}

export type GraphqlProviderProps = Arg1<typeof GraphqlProvider>
export type createClientProps = Arg1<typeof createClient>
