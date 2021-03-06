import React from 'react';
import PropTypes from 'prop-types'
import { shallow, mount, render } from 'enzyme';
// import { Provider, createStore } from 'react-redux'

import withValidation, { _validate, _ErrorMessage } from '../index'

const debug = require('debug')('with-validation:test')

describe('WithValidation', () => {

	function validator(val) {
		return val === 'invalid' ? 'wrong value!' : ''
	}

	describe('<_ErrorMessage messages={...} />', () => {
		it('renders nothing if there are no non-empty messages', () => {
			const messages = ['']
			const wrapper = shallow(<_ErrorMessage messages={messages} />)
			expect(wrapper.get(0)).toBeFalsy()
		})

		it('renders any non-empty messages', () => {
			const messages = ['one', '', 'two']
			const wrapper = shallow(<_ErrorMessage messages={messages} />)
			expect(wrapper.text()).toContain('one')
			expect(wrapper.text()).toContain('two')
			expect(wrapper.find('.input-error')).toHaveLength(1)
		})
	})

	describe('function _validate (internal)', () => {
		function _validateTruthy(val) {
			return !!val ? '' : 'val is falsy'
		}

		function _validateFoobar(val) {
			return val === 'foobar' ? '' : 'val not foobar'
		}

		it('validates given a function', () => {
			expect(_validate(_validateTruthy, false)).toEqual(['val is falsy'])
			expect(_validate(_validateTruthy, true)).toEqual([])
		})

		it('validates given an array', () => {
			expect(_validate([_validateTruthy, _validateFoobar], '')).toEqual(['val is falsy', 'val not foobar'])
		})
	})

	describe('with <input>', () => {

		function MyInput(props) {
			return <input type="text" {...props} />
		}
		let InputWithValidation, wrapper, input

		beforeAll(() => {
			InputWithValidation = withValidation(MyInput)
		})

		beforeEach(() => {
			wrapper = mount(<InputWithValidation className={'my-input'} validator={validator} />)
			input = wrapper.find('input')
		})

		it('is initially valid', () => {
			expect(input.hasClass('invalid')).toBeFalsy()
			expect(wrapper.find('.input-error')).toHaveLength(0)
		})

		it('remains valid after getting a valid value', () => {
			simulateChange(input, '2')
			expect(input.hasClass('invalid')).toBeFalsy()
			expect(wrapper.find('.input-error')).toHaveLength(0)
		})

		it('becomes invalid if validator not satisfied', () => {
			// simulateChange(input, '2')
			simulateChange(input, 'invalid')
			expect(input.hasClass('invalid')).toBeTruthy()
			expect(wrapper.find('.input-error')).toHaveLength(1)
			expect(wrapper.find('.input-error').text()).toBe('wrong value!')
		})

		it('does not overwrite other class names on wrapped input', () => {
			simulateChange(input, 'invalid')
			expect(input.hasClass('invalid')).toBeTruthy()
			expect(input.hasClass('my-input')).toBeTruthy()

			simulateChange(input, 'valid')
			expect(input.hasClass('invalid')).toBeFalsy()
			expect(input.hasClass('my-input')).toBeTruthy()
		})
	})

	describe('with input and onChange property', () => {

		function MyInput(props) {
			return <input type="text" {...props} />
		}
		let InputWithValidation, wrapper, input, onChange

		beforeAll(() => {
			InputWithValidation = withValidation(MyInput)
		})

		beforeEach(() => {
			onChange = jest.fn()
			wrapper = mount(<InputWithValidation onChange={onChange} validator={validator} />)
			input = wrapper.find('input')
		})

		it('calls onChange property', () => {
			expect(onChange).not.toHaveBeenCalled()
			simulateChange(input, '1')
			expect(onChange.mock.calls[0][0].target.value).toBe('1')
		})

		it('becomes invalid if validator not satisfied', () => {
			simulateChange(input, '2')
			simulateChange(input, 'invalid')
			expect(input.hasClass('invalid')).toBeTruthy()
			expect(wrapper.find('.input-error')).toHaveLength(1)
			expect(wrapper.find('.input-error').text()).toBe('wrong value!')
		})
	})

	describe('with <select>', () => {

		function MySelect(props) {
			return (
				<select {...props} >
					<option value=""></option>
					<option value="1">Option One</option>
					<option value="2">Option Two</option>
				</select>
			)
		}
		let MySelectWithValidation, wrapper, input

		beforeAll(() => {
			MySelectWithValidation = withValidation(MySelect)
		})

		beforeEach(() => {
			wrapper = mount(<MySelectWithValidation validator={validator} />)
			input = wrapper.find('select')
		})

		it('becomes invalid if validator not satisfied', () => {
			simulateChange(input, '2')
			simulateChange(input, 'invalid')
			expect(input.hasClass('invalid')).toBeTruthy()
			expect(wrapper.find('.input-error')).toHaveLength(1)
			expect(wrapper.find('.input-error').text()).toBe('wrong value!')
		})
	})

	describe('with multiple validators', () => {
		const msgMissing = 'value is missing'
		const msgNotANumber = 'not a number'

		function MyInput(props) {
			return <input type="text" {...props} />
		}

		function validateRequired(val) {
			return !!val ? '' : msgMissing
		}

		function validateNumber(val) {
			return Number.isFinite(val) ? '' : msgNotANumber
		}

		let InputWithValidation, wrapper, input

		beforeAll(() => {
			InputWithValidation = withValidation(MyInput)
		})

		beforeEach(() => {
			wrapper = mount(<InputWithValidation validator={[validateRequired, validateNumber]} />)
			input = wrapper.find('input')
		})

		it('calls multiple validators and concatenates messages', () => {
			simulateChange(input, 123)
			expect(input.hasClass('invalid')).toBeFalsy()
			expect(wrapper.find('.input-error')).toHaveLength(0)

			simulateChange(input, '')
			expect(input.hasClass('invalid')).toBeTruthy()
			expect(wrapper.find('.input-error')).toHaveLength(1)
			expect(wrapper.find('.input-error').text()).toContain(msgMissing)
			expect(wrapper.find('.input-error').text()).toContain(msgNotANumber)
		})
	})

	describe('With custom ErrorMessage element', () => {

		function MyErrorMessage({messages}) {
			const content = (messages || []).filter(msg => !!msg).join(', ')
			return content ? <span className="my-input-error">{content}</span> : null
		}
		MyErrorMessage.propTypes = {
			messages: PropTypes.arrayOf(PropTypes.string).isRequired,
		}

		function MyInput(props) {
			return <input type="text" {...props} />
		}
		let InputWithValidation, wrapper, input

		function validator(val) {
			return val === 'invalid' ? 'wrong value!' : ''
		}

		beforeAll(() => {
			InputWithValidation = withValidation(MyInput, MyErrorMessage)
		})

		beforeEach(() => {
			wrapper = mount(<InputWithValidation value={'invalid'} validator={validator} />)
			input = wrapper.find('input')
		})

		it('Responds to custom error message argument', () => {
			expect(wrapper.find('.my-input-error')).toHaveLength(1)
		})
	})

	xdescribe('Behavior when validators property changes', function() {
		class Translator {
			constructor(lang='en', dict={}) {
				this.lang = lang
				this.dict = dict
			}
			xlate(phrase) {
				dict[phrase] ? dict[phrase] : phrase
			}
		}
		const enTranslator = new Translator()
		const spTranslator = new Translator('sp', {
			'required': 'necesario'
		})
		function reduceAction(state={}, action) {
			const { type, ...payload } = action
			switch(type) {
			case 'validator':
				return {...state, ...payload }
			default:
				return state
			}
		}
		let store, wrapper, myInputError

		beforeEach(function() {
			store = createStore(reduceAction, {
				validator: val => !!val ? '' : enTranslator.xlate('required')
			})
			wrapper = mount(
				<Provider store={store}>
					<InputWithValidation value={'invalid'} />
				</Provider>
			)
			inputError = wrapper.find('.my-input-error')
		})

		it('re-renders error message', function() {
			expect(inputError).toHaveLength(1)
			expect(inputError.text()).toBe('required')

			store.dispatch({
				type: 'validator',
				validator: val => !!val ? '' : spTranslator.xlate('required'),
			})
			expect(inputError.text()).toBe('necesario')
		})
	})
})

function simulateChange(component, value) {
	component.simulate('change', {
		target: {
			name: component.props().name,
			value,
		}
	})
}
