import React from 'react';
import { 
  ExternalLink, 
  Github, 
  Linkedin, 
  Mail, 
  Phone,
  Award,
  Code,
  Database,
  Zap,
  TrendingUp,
  Globe,
  Shield,
  Clock
} from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: Zap,
      title: 'AI-Powered Field Mapping',
      description: 'Intelligent field matching with 95%+ accuracy using advanced algorithms'
    },
    {
      icon: TrendingUp,
      title: 'Real-Time Analytics',
      description: 'Live performance monitoring with comprehensive dashboard metrics'
    },
    {
      icon: Database,
      title: 'Multi-Org Sync',
      description: 'Seamless data synchronization across multiple Salesforce orgs'
    },
    {
      icon: Shield,
      title: 'Conflict Resolution',
      description: 'AI-driven automated conflict detection and resolution'
    },
    {
      icon: Globe,
      title: 'Enterprise Scale',
      description: 'Built for high-volume enterprise integration requirements'
    },
    {
      icon: Clock,
      title: 'Real-Time Updates',
      description: 'WebSocket-based live updates and monitoring'
    }
  ];

  const techStack = [
    { category: 'Frontend', technologies: ['React 18', 'Tailwind CSS', 'Chart.js', 'Socket.IO Client'] },
    { category: 'Backend', technologies: ['Node.js', 'Express.js', 'MongoDB', 'Socket.IO'] },
    { category: 'AI/ML', technologies: ['Custom AI Engine', 'Pattern Recognition', 'Conflict Resolution'] },
    { category: 'Hosting', technologies: ['Vercel (Frontend)', 'Render.com (Backend)', 'MongoDB Atlas'] },
    { category: 'DevOps', technologies: ['GitHub Actions', 'Health Monitoring', 'Error Tracking'] }
  ];

  const achievements = [
    { metric: '95%', label: 'Data Accuracy', description: 'AI field mapping precision' },
    { metric: '60%', label: 'Faster Setup', description: 'Automated configuration' },
    { metric: '99.9%', label: 'Uptime', description: 'Robust error handling' },
    { metric: '90%', label: 'Conflict Resolution', description: 'Automated handling' }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Multi-Org Integration Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          AI-powered Salesforce multi-org integration platform with real-time synchronization, 
          intelligent conflict resolution, and advanced analytics.
        </p>
      </div>

      {/* Project Overview */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Project Overview</h2>
        </div>
        <div className="card-body">
          <div className="prose max-w-none">
            <p className="text-gray-700 text-lg leading-relaxed">
              This platform demonstrates enterprise-level Salesforce integration capabilities, 
              showcasing modern development practices, AI-powered automation, and real-time 
              data synchronization. Built as a portfolio project to demonstrate advanced 
              Salesforce development and full-stack engineering skills.
            </p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Key Features</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Performance Metrics</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {achievement.metric}
                </div>
                <div className="font-semibold text-gray-900 mb-1">
                  {achievement.label}
                </div>
                <div className="text-sm text-gray-600">
                  {achievement.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technology Stack */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Technology Stack</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techStack.map((stack, index) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Code className="w-4 h-4 mr-2 text-blue-600" />
                  {stack.category}
                </h3>
                <div className="space-y-2">
                  {stack.technologies.map((tech, techIndex) => (
                    <div key={techIndex} className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                      {tech}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Developer Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">About the Developer</h2>
        </div>
        <div className="card-body">
          <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Developer Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Riya Singh</h3>
              <p className="text-gray-600 mb-4">
                Salesforce Developer & Systems Engineer with 3+ years of experience at 
                Tata Consultancy Services. Specialized in Salesforce platform development, 
                AI integration, and cloud technologies.
              </p>
              
              {/* Education & Certifications */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Award className="w-4 h-4 text-blue-600 mt-1" />
                  <div>
                    <div className="font-medium text-gray-900">Education</div>
                    <div className="text-sm text-gray-600">B.Tech - SRM Institute of Science and Technology (2019-2023)</div>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <Award className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <div className="font-medium text-gray-900">Certifications</div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>• Salesforce Platform Developer I (2025)</div>
                      <div>• AWS Certified Cloud Practitioner (2024)</div>
                      <div>• Salesforce AI Associate (2025)</div>
                      <div>• Salesforce Agentforce Specialist (2025)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-6 min-w-[280px]">
              <h4 className="font-semibold text-gray-900 mb-4">Connect with me</h4>
              <div className="space-y-3">
                <a 
                  href="mailto:singh.riya037200@gmail.com"
                  className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">singh.riya037200@gmail.com</span>
                </a>
                
                <a 
                  href="tel:+919631102231"
                  className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+91 9631102231</span>
                </a>
                
                <a 
                  href="https://linkedin.com/in/riyasi20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm">linkedin.com/in/riyasi20</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                
                <a 
                  href="https://riya037.github.io/Riya-Singh-CV-Website/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">Portfolio Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Links */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-2xl font-semibold text-gray-900">Project Resources</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Live Demo</h3>
              <div className="space-y-2">
                <a 
                  href="https://multi-org-integration.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <Globe className="w-4 h-4" />
                  <span>Frontend Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a 
                  href="https://multi-org-integration-platform-645l.onrender.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <Database className="w-4 h-4" />
                  <span>Backend API</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Source Code</h3>
              <div className="space-y-2">
                <a 
                  href="https://github.com/riya037/Multi-Org-Integration-Platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="text-sm text-gray-600">
                  Complete source code with documentation and deployment instructions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Information */}
      <div className="text-center py-6 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Multi-Org Integration Platform v1.0.0 • Built with ❤️ by Riya Singh • 
          Showcasing enterprise-level Salesforce development expertise
        </p>
      </div>
    </div>
  );
};

export default About;