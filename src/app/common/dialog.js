drnull.Dialog.BaseDialog = Class.create({
	initialize: function(assistant, title, message, choices, options) {
		this.assistant = assistant;
		this.title = title;
		this.message = message;
		this.choices = choices;
		this.options = options||{};
	},
	show: function() {
		var options = {
			allowHTMLMessage: true,
			onChoose: this.onChoose.bind(this),
			title: this.title,
			message: this.message,
			choices: this.choices
		};
		for (var p in this.options) {
			if (this.options.hasOwnProperty(p)) {
				options[p] = this.options[p];
			}
		}

		this.dialog = this.assistant.controller.showAlertDialog(options);
	},
	onChoose: function(value) {
		Mojo.Log.error("abstract onChoose called");
		undefined.fail();
	}
});

drnull.Dialog.Info = Class.create(drnull.Dialog.BaseDialog, {
	initialize: function($super, assistant, title, message) {
		var choices = [{
			label: $L('OK'),
			value: 'ok',
			type: 'affirmative'
		}];
		$super(assistant, title, message, choices);
	},
	onChoose: function(value) {
	}
});

drnull.Dialog.Confirm = Class.create(drnull.Dialog.BaseDialog, {
	initialize: function($super, assistant, title, message, chooseYes, chooseNo, chooseCancel) {
		var choices = [{
			label: $L('Yes'),
			value: 'yes',
			type: 'affirmative'
		},{
			label: $L('No'),
			value: 'no',
			type: 'negative'
		}];

		this.chooseYes = chooseYes || function() {};
		this.chooseNo = chooseNo || function() {};
		this.chooseCancel = chooseCancel || function() {};

		$super(assistant, title, message, choices);
	},
	onChoose: function(value) {
		Mojo.Log.warn("Confirm.onChoose(" + value + ") called");
		switch (value) {
			case "yes":
				this.chooseYes();
				break;
			case "no":
				this.chooseNo();
				break;
			default:
				this.chooseCancel();
				break;
		}
	}
});
