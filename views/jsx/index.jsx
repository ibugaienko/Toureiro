var React = require('react');
var LinkedStateMixin = require('react/addons').addons.LinkedStateMixin;
var $ = require('jquery');

var Sidebar = require('./sidebar.jsx');
var Jobs = require('./jobs.jsx').Jobs;
var JobDetails = require('./jobs.jsx').JobDetails;
var AddJob = require('./jobs.jsx').AddJob;

var Toureiro = React.createClass({

  mixins: [LinkedStateMixin],

  getInitialState: function() {
    var state = {
      queue: undefined,
      category: undefined,
      readonly: true
    };
    return state;
  },

  handleQueueChange: function(queue) {
    this.setState({
      queue: queue
    });
  },

  handleCategoryChange: function(category) {
    var _this = this;
    this.setState({
      category: category
    }, function() {
      if (_this.refs.jobs) {
        _this.refs.jobs.setState({
          page: 0
        }, function() {
          _this.refs.jobs.fetchJobs();
        });
      }
    });
  },

  renderMainContent: function() {
    var _this = this;
    if (_this.state.category === 'job') {
      return (<JobDetails queue={_this.state.queue} readonly={_this.state.readonly} />);
    } else if (_this.state.category === 'new-job') {
      return (<AddJob queue={_this.state.queue} />);
    }
    return (<Jobs ref="jobs" queue={_this.state.queue} category={this.state.category} readonly={_this.state.readonly} />);
  },

  render: function() {
    var _this = this;
    return (
      <div id="toureiro">
        <Sidebar onQueueChange={this.handleQueueChange} onCategoryChange={this.handleCategoryChange} readonlyLink={this.linkState('readonly')} />
        <div id="toureiro-canvas">
        {
          (_this.state.queue && _this.state.category) ?
            this.renderMainContent() : ''
        }
        </div>
      </div>
    );
  }
});

React.render(<Toureiro />, $('#toureiro-wrapper')[0]);
