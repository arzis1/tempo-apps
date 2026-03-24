import { ClientOnly } from '@tanstack/react-router'
import * as React from 'react'
import { Hooks } from 'wagmi/tempo'
import {
	useChains,
	useConnect,
	useConnection,
	useConnectors,
	useSwitchChain,
} from 'wagmi'
import { cx } from '#lib/css'
import { filterSupportedInjectedConnectors } from '#lib/wallets.ts'
import { getTempoChain } from '#wagmi.config.ts'
import { Button } from '#comps/ConnectWallet'
import type { Address } from 'ox'

const TEMPO_CHAIN_ID = getTempoChain().id

export function SetAsFeeToken(props: SetAsFeeToken.Props): React.JSX.Element {
	return (
		<ClientOnly fallback={null}>
			<SetAsFeeTokenInner {...props} />
		</ClientOnly>
	)
}

export declare namespace SetAsFeeToken {
	type Props = {
		address: Address.Address
		symbol?: string | undefined
	}
}

function SetAsFeeTokenInner(props: SetAsFeeToken.Props): React.JSX.Element {
	const { address: tokenAddress, symbol } = props

	const connect = useConnect()
	const connectors = useConnectors()
	const { address: account, chain, connector } = useConnection()
	const chains = useChains()
	const switchChain = useSwitchChain()
	const setFeeToken = Hooks.fee.useSetUserTokenSync()
	const userToken = Hooks.fee.useUserToken({ account })

	const [showSuccess, setShowSuccess] = React.useState(false)

	const supportedConnectors = React.useMemo(
		() => filterSupportedInjectedConnectors(connectors),
		[connectors],
	)

	const isConnected = !!account
	const isOnTempoChain = chains.some((c) => c.id === chain?.id)
	const walletName = connector?.name ?? 'Wallet'
	const isAlreadyFeeToken =
		userToken.data?.address?.toLowerCase() === tokenAddress.toLowerCase()

	React.useEffect(() => {
		if (!showSuccess) return
		const timer = setTimeout(() => setShowSuccess(false), 3_000)
		return () => clearTimeout(timer)
	}, [showSuccess])

	if (supportedConnectors.length === 0) return <></>

	const handleClick = () => {
		if (!isConnected) {
			const primaryConnector = supportedConnectors[0]
			if (primaryConnector) connect.mutate({ connector: primaryConnector })
			return
		}

		if (!isOnTempoChain) {
			switchChain.mutate({
				chainId: TEMPO_CHAIN_ID,
				addEthereumChainParameter: {
					nativeCurrency: { name: 'USD', decimals: 18, symbol: 'USD' },
				},
			})
			return
		}

		if (!account) return
		setFeeToken.mutate(
			{ token: tokenAddress, account },
			{ onSuccess: () => setShowSuccess(true) },
		)
	}

	const isPending =
		connect.isPending || switchChain.isPending || setFeeToken.isPending

	const label = (() => {
		if (showSuccess) return 'Fee token set!'
		if (isAlreadyFeeToken) return 'Already your fee token ✓'
		if (!isConnected) return `Connect ${walletName}`
		if (!isOnTempoChain) return 'Switch to Tempo'
		if (setFeeToken.isPending) return 'Setting…'
		return `Set ${symbol ?? 'token'} as fee token`
	})()

	return (
		<Button
			type="button"
			variant="default"
			onClick={handleClick}
			disabled={isPending || isAlreadyFeeToken}
			className={cx(
				'rounded-[8px] bg-base-plane-interactive px-[10px] py-[6px] text-primary border border-base-border hover:bg-base-plane hover:no-underline transition-colors justify-center',
				isPending && 'animate-pulse',
			)}
		>
			{label}
		</Button>
	)
}
