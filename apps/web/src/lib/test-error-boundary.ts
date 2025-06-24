/**
 * Test functions to verify error boundary functionality
 */

export function testErrorBoundary() {
	console.log('Testing error boundary...');
	
	// Test 1: Throw a synchronous error
	setTimeout(() => {
		throw new Error('Test synchronous error - Error boundary should catch this');
	}, 100);
}

export function testUnhandledRejection() {
	console.log('Testing unhandled promise rejection...');
	
	// Test 2: Create an unhandled promise rejection
	setTimeout(() => {
		Promise.reject(new Error('Test promise rejection - Error boundary should catch this'));
	}, 100);
}

export function testVaultError() {
	console.log('Testing vault-specific error...');
	
	// Test 3: Simulate a vault decryption error
	setTimeout(() => {
		throw new Error('Failed to decrypt vault data');
	}, 100);
}

export function testNetworkError() {
	console.log('Testing network error...');
	
	// Test 4: Simulate a network error
	setTimeout(() => {
		throw new Error('Network request failed: Unable to fetch data');
	}, 100);
}

// Development only - Remove in production
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	// @ts-ignore
	window.testErrors = {
		testErrorBoundary,
		testUnhandledRejection,
		testVaultError,
		testNetworkError
	};
	
	console.log('Error boundary tests available in console:');
	console.log('- window.testErrors.testErrorBoundary()');
	console.log('- window.testErrors.testUnhandledRejection()');
	console.log('- window.testErrors.testVaultError()');
	console.log('- window.testErrors.testNetworkError()');
}