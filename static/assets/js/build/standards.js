define(["jquery","core","underscore","backbone","react","backboneReact"],function(e,a,n,d,t,s){a.api.standards={read:function(){e.get("/resources/api/search/"+request.term+"/",function(a){response(e.map(a,function(e){return{label:e,value:e}}))},"json")},fetchStandards:function(a,n){e.get("/meta/api/get-nested-child-tags-from-category/"+a+"/",function(e){n(e.tags)},"json")}},n.extend(a.standards,{loadFreeze:function(){var a=e(".page-loader");if(0===a.length){var n=e("<div/>",{"class":"page-loader"});e("body").append(n);var d=e(".category-selection-bar").outerHeight();a=e(".page-loader"),a.css({top:d,height:e(window).height()-d})}a.addClass("load")},endLoadFreeze:function(){e(".page-loader").removeClass("load")},Grade:d.Model.extend({id:"",title:"",position:"",sync:function(e,d,t){function s(e){standards=new a.standards.Standards,n.each(e,function(e){standards.add(new a.standards.Standard(e))}),d.set("standards",standards),t.success()}switch(e){case"read":a.api.standards.fetchStandards(this.get("id"),s)}}}),GradeView:t.createClass({mixins:[s],getInitialState:function(){return{loading:!1}},componentDidMount:function(){},renderStandards:function(){function d(e){var d=n.groupBy(e.models,function(e){return e.get("domain")});a.standards.domains.reset();var t;n.each(d,function(e,n){t=new a.standards.Domain({title:n}),t.set("standards",new a.standards.Standards(e)),a.standards.domains.add(t)})}function s(){d(r.getModel().get("standards")),t.renderComponent(a.standards.DomainsView({models:a.standards.domains}),e(".middle-menu").get(0))}var r=this;r.getModel().has("standards")?s():(this.loading(),this.getModel().fetch({success:function(){s()},error:function(){r.stopLoading()}}))},loading:function(){t.renderComponent(a.standards.StandardsView({collection:a.standards.standardsCollection,loading:!0}),e(".middle-menu").get(0))},stopLoading:function(){t.renderComponent(a.standards.StandardsView({collection:a.standards.standardsCollection,loading:!1}),e(".middle-menu").get(0))},render:function(){return t.DOM.li({onClick:this.renderStandards},this.props.title)}}),Grades:d.Collection.extend({model:a.standards.Grade}),GradesView:t.createClass({mixins:[s],render:function(){var e={};return this.props.models.forEach(function(n){e["react-"+n.get("id")]=a.standards.GradeView({model:n})}),t.DOM.ul({className:"category-grades"},e)}}),Standard:d.Model.extend({id:""}),Standards:d.Collection.extend({model:a.standards.Standard}),StandardView:t.createClass({mixins:[s],renderStandardInfo:function(){},render:function(){return t.DOM.li({onClick:this.renderStandardInfo(),className:"standards-listing-item"},this.props.title+": "+this.props.description)}}),StandardsView:t.createClass({mixins:[s],renderStandards:function(e){return a.standards.StandardView({model:e})},render:function(){var e=this.props.loading?"loading":"";return this.props.collection?t.DOM.ul({className:e},this.props.collection.map(this.renderStandards)):t.DOM.ul({className:"empty"})}}),Domain:d.Model.extend({id:"",title:"",position:"",standards:""}),DomainView:t.createClass({mixins:[s],renderStandard:function(e){return a.standards.StandardView({model:e})},render:function(){return t.DOM.div(null,[t.DOM.div({className:"domain-title"},this.props.title),t.DOM.ul({className:"standards-listing"},this.props.standards.map(this.renderStandard))])}}),Domains:d.Collection.extend({model:a.standards.Domain}),DomainsView:t.createClass({mixins:[s],renderDomain:function(e){return a.standards.DomainView({model:e})},render:function(){return t.DOM.div({className:"domains-listing"},this.props.models.map(this.renderDomain))}}),StandardInfoView:t.createClass({mixins:[s],render:function(){}})}),a.standards.grades=new a.standards.Grades,n.each(a.standards.rawGrades,function(e){a.standards.grades.add(new a.standards.Grade(e))}),a.standards.domains=new a.standards.Domains,e(document).ready(function(e){function n(){e(".category-standards-body").height(e(window).height()-e(".category-selection-bar").outerHeight())}n(),e(window).resize(n),t.renderComponent(a.standards.GradesView({models:a.standards.grades}),e(".left-menu").get(0)),a.standards.standardsCollection=new a.standards.Standards,e('select[name="standard"]').change(function(){function n(n){var d;for(a.standards.grades.reset(),d=0;d<n.grades.length;d++)a.standards.grades.add(new a.standards.Grade(n.grades[d]));t.renderComponent(a.standards.GradesView({models:a.standards.grades}),e(".left-menu").get(0));var s,r,i=e('select[name="grade"]');for(s=0;s<n.subjects.length;s++)r=e("<option/>",{name:"category-"+n.subjects[s].id,html:n.subjects[s].title}),i.empty(),i.append(r);a.standards.standardsCollection.reset(),t.renderComponent(a.standards.StandardsView({collection:a.standards.standardsCollection}),e(".middle-menu").get(0))}a.standards.loadFreeze();var d=e("option:selected",this).attr("name").substring(9);e.get("/meta/api/standard/"+d+"/",function(e){n(e),a.standards.endLoadFreeze()},"json")}),window.$=e})});